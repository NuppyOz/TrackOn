import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { procedenciaRouter } from './procedencia/procedencia.routes.js';
import { contratosGerencialesRouter } from './contratos/contratos.routes.js';
import { comprobantesGerencialesRouter } from './finanzas/documentos/documentos.routes.js';
import { facturablesGerencialesRouter } from './finanzas/facturables/facturables.routes.js';
import { cobrosGerencialesRouter } from './finanzas/cobros/cobros.routes.js';
import { costosGerencialesRouter } from './finanzas/costos/costos.routes.js';

export const fuentesGerencialesRouter = Router();
fuentesGerencialesRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
fuentesGerencialesRouter.use(procedenciaRouter);
fuentesGerencialesRouter.use(contratosGerencialesRouter);
fuentesGerencialesRouter.use('/finanzas', comprobantesGerencialesRouter, facturablesGerencialesRouter, cobrosGerencialesRouter, costosGerencialesRouter);
