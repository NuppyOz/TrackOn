import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import * as service from './ordenes.equipos.service.js';
import {
    agregarEquipoOrdenSchema,
    diagnosticoParamsSchema,
    ordenEquipoParamsSchema,
    registrarDiagnosticoSchema,
} from './ordenes.equipos.schema.js';

function obtenerActor(req: Request) {
    if (!req.auth) throw new AppError(401, 'Se requiere autenticación.');
    return {
        id: req.auth.usuario.id,
        empleadoId: req.auth.usuario.empleado.id,
        rol: req.auth.usuario.rol.cod,
    };
}

export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        obtenerActor(req);
        const { id } = ordenEquipoParamsSchema.parse(req.params);
        res.json({ data: await service.listar(id) });
    } catch (error) { next(error); }
}

export async function disponibles(req: Request, res: Response, next: NextFunction) {
    try {
        obtenerActor(req);
        const { id } = ordenEquipoParamsSchema.parse(req.params);
        res.json({ data: await service.listarDisponibles(id) });
    } catch (error) { next(error); }
}

export async function vincular(req: Request, res: Response, next: NextFunction) {
    try {
        obtenerActor(req);
        const { id } = ordenEquipoParamsSchema.parse(req.params);
        const { equipoId } = agregarEquipoOrdenSchema.parse(req.body);
        res.status(201).json({ data: await service.vincular(id, equipoId) });
    } catch (error) { next(error); }
}

export async function diagnosticar(req: Request, res: Response, next: NextFunction) {
    try {
        const actor = obtenerActor(req);
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        const datos = registrarDiagnosticoSchema.parse(req.body);
        res.json({ data: await service.registrarDiagnostico(id, registroId, datos, actor) });
    } catch (error) { next(error); }
}
