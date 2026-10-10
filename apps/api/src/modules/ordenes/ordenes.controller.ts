import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import * as service from './ordenes.service.js';
import * as asignacionService from './ordenes.asignacion.service.js';
import { asignarOrdenSchema } from './ordenes.asignacion.schema.js';
import { cambiarEstadoOrdenSchema, crearOrdenSchema, listarOrdenesSchema, ordenParamsSchema } from './ordenes.schema.js';

function usuarioActual(req: Request): number {
    if (!req.auth) throw new AppError(401, 'Se requiere autenticación.');
    return req.auth.usuario.id;
}

export async function crear(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = usuarioActual(req);
        res.status(201).json({ data: await service.crear(crearOrdenSchema.parse(req.body), usuarioId) });
    } catch (error) { next(error); }
}

export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        usuarioActual(req);
        res.json({ data: await service.listar(listarOrdenesSchema.parse(req.query)) });
    } catch (error) { next(error); }
}

export async function obtener(req: Request, res: Response, next: NextFunction) {
    try {
        usuarioActual(req);
        const { id } = ordenParamsSchema.parse(req.params);
        res.json({ data: await service.obtener(id) });
    } catch (error) { next(error); }
}

export async function cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = usuarioActual(req);
        const { id } = ordenParamsSchema.parse(req.params);
        res.json({ data: await service.cambiarEstado(id, cambiarEstadoOrdenSchema.parse(req.body), usuarioId) });
    } catch (error) { next(error); }
}

export async function asignar(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = usuarioActual(req);
        const { id } = ordenParamsSchema.parse(req.params);
        const datos = asignarOrdenSchema.parse(req.body);
        res.json({ data: await asignacionService.asignar(id, datos, usuarioId) });
    } catch (error) { next(error); }
}
