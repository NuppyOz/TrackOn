import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { resumen } from './dashboard.repository.js';
import { cached } from '../../infrastructure/cache.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
dashboardRouter.get('/resumen', async (_req, res, next) => {
    try { res.json({ data: await cached('dashboard', 'resumen', 20, () => resumen()) }); } catch (error) { next(error); }
});
