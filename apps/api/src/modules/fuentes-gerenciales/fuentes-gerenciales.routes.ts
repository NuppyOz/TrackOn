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
import { articulosGerencialesRouter } from './logistica/articulos/articulos.routes.js';
import { movimientosGerencialesRouter } from './logistica/movimientos/movimientos.routes.js';
import { comprasGerencialesRouter } from './logistica/compras/compras.routes.js';
import { herramientasGerencialesRouter } from './logistica/herramientas/herramientas.routes.js';

import { garantiasGerencialesRouter } from './calidad/garantias/garantias.routes.js';
import { casosCalidadGerencialesRouter } from './calidad/casos/casos.routes.js';

import { correctivasGerencialesRouter } from './calidad/correctivas/correctivas.routes.js';

export const fuentesGerencialesRouter = Router();
fuentesGerencialesRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
fuentesGerencialesRouter.use(procedenciaRouter);
fuentesGerencialesRouter.use(contratosGerencialesRouter);
fuentesGerencialesRouter.use('/finanzas', comprobantesGerencialesRouter, facturablesGerencialesRouter, cobrosGerencialesRouter, costosGerencialesRouter);
fuentesGerencialesRouter.use('/logistica', articulosGerencialesRouter, movimientosGerencialesRouter);
fuentesGerencialesRouter.use('/logistica/compras', comprasGerencialesRouter);
fuentesGerencialesRouter.use('/logistica', herramientasGerencialesRouter);

fuentesGerencialesRouter.use('/calidad/garantias', garantiasGerencialesRouter);
fuentesGerencialesRouter.use('/calidad/casos', casosCalidadGerencialesRouter);
fuentesGerencialesRouter.use('/calidad/correctivas', correctivasGerencialesRouter);
