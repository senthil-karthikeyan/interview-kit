import { Router, type IRouter } from 'express';

export const kitsRouter: IRouter = Router();

// Routes will be implemented in Phase 12+
kitsRouter.get('/', (_req, res) => {
  res.json({ message: 'kits module stub' });
});
