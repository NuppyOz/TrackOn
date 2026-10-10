import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import * as controller from './ordenes.controller.js';
import * as equiposOrden from './ordenes.equipos.controller.js';

export const ordenesRouter = Router();
ordenesRouter.use(authenticate);

ordenesRouter.get('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);
ordenesRouter.get('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);
ordenesRouter.post('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);
ordenesRouter.post('/:id/asignacion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.asignar);
ordenesRouter.patch('/:id/estado', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.cambiarEstado);

// Equipos vinculados a la ubicación de la OT y diagnósticos técnicos.
ordenesRouter.get('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), equiposOrden.listar);
ordenesRouter.get('/:id/equipos-disponibles', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.disponibles);
ordenesRouter.post('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.vincular);
ordenesRouter.patch('/:id/equipos/:registroId/diagnostico', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), equiposOrden.diagnosticar);
