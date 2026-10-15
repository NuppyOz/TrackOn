import { Router, raw } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import * as controller from './ordenes.controller.js';
import * as equiposOrden from './ordenes.equipos.controller.js';
import * as trabajo from './ordenes.trabajo.controller.js';
import * as evidencias from './ordenes.evidencias.controller.js';
import { MAX_EVIDENCE_BYTES } from './ordenes.evidencias.schema.js';

export const ordenesRouter = Router();
ordenesRouter.use(authenticate);

ordenesRouter.get('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);
ordenesRouter.get('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);
ordenesRouter.post('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);
ordenesRouter.patch('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.editar);
ordenesRouter.post('/:id/asignacion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.asignar);
ordenesRouter.patch('/:id/estado', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.cambiarEstado);
ordenesRouter.patch('/:id/ejecucion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.ejecutar);

// Equipos vinculados a la ubicación de la OT y diagnósticos técnicos.
ordenesRouter.get('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), equiposOrden.listar);
ordenesRouter.get('/:id/equipos-disponibles', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.disponibles);
ordenesRouter.post('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.vincular);
ordenesRouter.post('/:id/equipos-provisionales', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), equiposOrden.provisional);
ordenesRouter.patch('/:id/equipos/:registroId/diagnostico', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), equiposOrden.diagnosticar);
ordenesRouter.get('/:id/equipos/:registroId/trabajo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), trabajo.listar);
ordenesRouter.post('/:id/equipos/:registroId/servicios', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), trabajo.servicio);
ordenesRouter.post('/:id/equipos/:registroId/materiales', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), trabajo.material);
ordenesRouter.get('/:id/equipos/:registroId/evidencias', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), evidencias.listar);
ordenesRouter.post('/:id/equipos/:registroId/evidencias', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), evidencias.crear);
ordenesRouter.put('/:id/equipos/:registroId/evidencias/:evidenciaId/archivo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), raw({ type: 'application/octet-stream', limit: MAX_EVIDENCE_BYTES }), evidencias.cargar);
ordenesRouter.get('/:id/equipos/:registroId/evidencias/:evidenciaId/archivo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), evidencias.descargar);
ordenesRouter.post('/:id/equipos/:registroId/evidencias/:evidenciaId/revision', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), evidencias.revisar);
