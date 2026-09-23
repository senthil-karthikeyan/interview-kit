import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';

/**
 * Middleware that protects routes — requires an active session.
 * Apply to any route that should only be accessible by logged-in users.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.session.userId) {
    next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    return;
  }
  next();
}
