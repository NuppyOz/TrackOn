import { z } from 'zod';
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { resumen } from './dashboard.repository.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
dashboardRouter.get('/resumen', async (req, res, next) => {
    try {
        res.json({
            data: await resumen(
                new Date(),
                z.enum(['hoy', 'semana', 'mes']).default('mes').parse(req.query.periodo),
            ),
        });
    } catch (error) {
        next(error);
    }
});
