import { Router } from 'express';
import { login, refresh, logout, me } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

export const authRouter = Router();

authRouter.post( '/login', login );
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

authRouter.get('/me', authenticate, me);