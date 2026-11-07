import { Router, raw } from 'express';
import { prisma } from '../../infrastructure/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { obtenerActorOrden } from './ordenes.actor.js';
import type { Request, Response, NextFunction } from 'express';
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
// Restringir todas las rutas anidadas de una OT a técnicos con asignación vigente.
async function autorizarConsultaOrden(req: Request, _res: Response, next: NextFunction) {
    try {
        if (!req.auth) throw new AppError(401, 'Se requiere autenticación.');
        if (req.auth.usuario.rol.cod === 'TEC') {
            const actor = obtenerActorOrden(req);
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0) throw new AppError(400, 'ID de orden inválido.');
            const visible = await prisma.ordenTrabajo.findFirst({
                where: {
                    id,
                    estadoCodigo: { in: ['ASIGNADA', 'EN_EJECUCION', 'EN_REVISION'] },
                    asignaciones: { some: {
                        fin: null,
                        OR: [
                            { empleadoResponsableId: actor.empleadoId },
                            { tecnicos: { some: { empleadoId: actor.empleadoId } } },
                            { cuadrilla: { is: { miembros: { some: { empleadoId: actor.empleadoId, fin: null } } } } },
                        ],
                    } },
                },
                select: { id: true },
            });
            if (!visible) throw new AppError(404, 'La orden no está disponible para este técnico.');
        }
        next();
    } catch (error) { next(error); }
}
// Aplicar el control de asignación SOLO después de comprobar los permisos por rol
// en las rutas que realmente puede utilizar TEC.

ordenesRouter.get('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, controller.obtener);
ordenesRouter.post('/', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);
ordenesRouter.patch('/:id', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.editar);
ordenesRouter.post('/:id/asignacion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.asignar);
ordenesRouter.patch('/:id/estado', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.cambiarEstado);
ordenesRouter.patch('/:id/ejecucion', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, controller.ejecutar);

// Equipos vinculados a la ubicación de la OT y diagnósticos técnicos.
ordenesRouter.get('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, equiposOrden.listar);
ordenesRouter.get('/:id/equipos-disponibles', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.disponibles);
ordenesRouter.post('/:id/equipos', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), equiposOrden.vincular);
ordenesRouter.post('/:id/equipos-provisionales', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, equiposOrden.provisional);
ordenesRouter.patch('/:id/equipos/:registroId/diagnostico', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, equiposOrden.diagnosticar);
ordenesRouter.get('/:id/equipos/:registroId/trabajo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, trabajo.listar);
ordenesRouter.post('/:id/equipos/:registroId/servicios', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, trabajo.servicio);
ordenesRouter.post('/:id/equipos/:registroId/materiales', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, trabajo.material);
ordenesRouter.get('/:id/equipos/:registroId/evidencias', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, evidencias.listar);
ordenesRouter.post('/:id/equipos/:registroId/evidencias', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, evidencias.crear);
ordenesRouter.put('/:id/equipos/:registroId/evidencias/:evidenciaId/archivo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, raw({ type: 'application/octet-stream', limit: MAX_EVIDENCE_BYTES }), evidencias.cargar);
ordenesRouter.get('/:id/equipos/:registroId/evidencias/:evidenciaId/archivo', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), autorizarConsultaOrden, evidencias.descargar);
ordenesRouter.post('/:id/equipos/:registroId/evidencias/:evidenciaId/revision', authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), evidencias.revisar);
