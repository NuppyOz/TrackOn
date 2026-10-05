import type { NextFunction, Request, Response } from 'express';
import * as service from './equipos.service.js';
import { createEquipoSchema, equipoParamsSchema, listarEquiposQuerySchema, updateEquipoSchema, updateEstadoEquipoSchema } from './equipos.schema.js';

export async function crear(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ data: await service.crearEquipo(createEquipoSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function listar(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarEquipos(listarEquiposQuerySchema.parse(req.query)) }); } catch (error) { next(error); }
}
export async function listarUbicaciones(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarUbicacionesActivas() }); } catch (error) { next(error); }
}
export async function obtener(req: Request, res: Response, next: NextFunction) {
    try { const { id } = equipoParamsSchema.parse(req.params); res.json({ data: await service.obtenerEquipo(id) }); } catch (error) { next(error); }
}
export async function actualizar(req: Request, res: Response, next: NextFunction) {
    try { const { id } = equipoParamsSchema.parse(req.params); res.json({ data: await service.actualizarEquipo(id, updateEquipoSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function actualizarEstado(req: Request, res: Response, next: NextFunction) {
    try { const { id } = equipoParamsSchema.parse(req.params); const { activo } = updateEstadoEquipoSchema.parse(req.body); res.json({ data: await service.actualizarEstadoEquipo(id, activo) }); } catch (error) { next(error); }
}
