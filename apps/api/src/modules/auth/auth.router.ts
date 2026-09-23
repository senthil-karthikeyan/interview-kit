import { Router, type IRouter } from 'express';

export const authRouter: IRouter = Router();

// Routes will be implemented in Phase 3
authRouter.get('/me', (_req, res) => {
  res.json({ message: 'auth module stub' });
});
