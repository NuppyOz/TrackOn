import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { perfilComercialRouter } from './crm/perfil/perfil.routes.js';
import { contactosComercialesRouter } from './crm/contactos/contactos.routes.js';
import { notasRouter } from './crm/notas/notas.routes.js';
import { documentosRouter } from './crm/documentos/documentos.routes.js';
import { tarifasComercialesRouter } from './tarifas/tarifas.routes.js';

export const comercialRouter = Router();
comercialRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));
comercialRouter.use('/clientes/:clienteId', perfilComercialRouter, contactosComercialesRouter, notasRouter, documentosRouter);
comercialRouter.use(tarifasComercialesRouter);
