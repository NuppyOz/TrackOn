import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { indicadoresComercialesRouter } from './comercial/comercial.routes.js';
import { indicadoresFinancierosRouter } from './financiero/financiero.routes.js';
import { indicadoresLogisticosRouter } from './logistico/logistico.routes.js';

import { indicadoresCalidadRouter } from './calidad/calidad.routes.js';

import { asistenteIndicadoresRouter } from './asistente/asistente.routes.js';

export const inteligenciaRouter = Router();
inteligenciaRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
inteligenciaRouter.use('/comercial', indicadoresComercialesRouter);
inteligenciaRouter.use('/financiero', indicadoresFinancierosRouter);
inteligenciaRouter.use('/logistico', indicadoresLogisticosRouter);
inteligenciaRouter.use('/calidad', indicadoresCalidadRouter);
inteligenciaRouter.use('/asistente', asistenteIndicadoresRouter);
