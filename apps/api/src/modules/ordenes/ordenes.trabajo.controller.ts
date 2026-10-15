import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import { obtenerActorOrden } from './ordenes.actor.js';
import { diagnosticoParamsSchema } from './ordenes.equipos.schema.js';
import { registrarMaterialOrdenSchema, registrarServicioOrdenSchema } from './ordenes.trabajo.schema.js';
import * as repository from './ordenes.trabajo.repository.js';

function manejarConflicto(error: unknown, next: NextFunction) {
    next(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
        ? new AppError(409, 'La orden cambió durante el registro. Actualízala e inténtalo de nuevo.') : error);
}
export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        res.json({ data: await repository.listarTrabajo(id, registroId) });
    } catch (error) { next(error); }
}
export async function servicio(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        res.status(201).json({ data: await repository.registrarServicio(id, registroId,
            registrarServicioOrdenSchema.parse(req.body), obtenerActorOrden(req)) });
    } catch (error) { manejarConflicto(error, next); }
}
export async function material(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        res.status(201).json({ data: await repository.registrarMaterial(id, registroId,
            registrarMaterialOrdenSchema.parse(req.body), obtenerActorOrden(req)) });
    } catch (error) { manejarConflicto(error, next); }
}
