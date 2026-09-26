import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db/connection.js';
import { authRouter } from './modules/auth/auth.router.js';
import { kitsRouter } from './modules/kits/kits.router.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';

const app: Express = express();
// Trust first proxy (Render, Netlify, Nginx) for HTTPS protocol detection & secure cookies
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const allowedOrigins = FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''));

// Determine production mode: HTTPS cross-origin between distinct cloud domains
const isProduction =
  process.env.NODE_ENV === 'production' &&
  !FRONTEND_URL.includes('localhost') &&
  !FRONTEND_URL.includes('127.0.0.1');

const cookieSecure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : isProduction;

const cookieSameSite = (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict') ||
  (isProduction ? 'none' : 'lax');

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Rate limiters for security & abuse prevention
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 10000,
  skip: () => !isProduction,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 60 : 500,
  skip: (req) => req.method === 'GET' || req.path.endsWith('/me'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many authentication attempts, please try again later.', code: 'AUTH_RATE_LIMITED' } },
});

// ── Request parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Session ──────────────────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/interviewkit',
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  cookie: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'InterviewKit API' });
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/kits', kitsRouter);

// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`InterviewKit API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Reloaded at 22:08 with GEMINI_MODEL=gemma-4-26b-a4b-it and LLM_MAX_RETRIES=5
