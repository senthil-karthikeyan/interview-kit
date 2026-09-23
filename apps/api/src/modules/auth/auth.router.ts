import { Router, type IRouter } from 'express';
import { register, login, logout, getMe } from './auth.handlers.js';

export const authRouter: IRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', getMe);
