import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import * as controller from './ordenes.controller.js';

export const ordenesRouter = Router();
ordenesRouter.use(authenticate);

ordenesRouter.get('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);
ordenesRouter.get('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);
ordenesRouter.post('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);
ordenesRouter.post('/:id/asignacion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.asignar);
ordenesRouter.patch('/:id/estado', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.cambiarEstado);
