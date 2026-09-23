import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from './user.model.js';
import { RegisterInputSchema, LoginInputSchema } from '@interviewkit/schemas';
import { AppError } from '../../middleware/error.middleware.js';

// Augment express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = RegisterInputSchema.parse(req.body);

    const existing = await User.findOne({ email: body.email });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({ email: body.email, passwordHash });

    req.session.userId = user._id.toString();

    res.status(201).json({
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = LoginInputSchema.parse(req.body);

    const user = await User.findOne({ email: body.email });
    if (!user) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    req.session.userId = user._id.toString();

    res.json({
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export function logout(req: Request, res: Response, next: NextFunction): void {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

// ── Me ────────────────────────────────────────────────────────────────────────

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      throw new AppError(401, 'Not authenticated', 'UNAUTHENTICATED');
    }

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy(() => undefined);
      throw new AppError(401, 'Session expired', 'SESSION_EXPIRED');
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
