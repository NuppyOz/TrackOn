import type { NextFunction, Request, Response } from 'express';
import * as service from './servicios.service.js';
import { createServicioSchema, listarServiciosQuerySchema, servicioParamsSchema, updateEstadoServicioSchema, updateServicioSchema } from './servicios.schema.js';

export async function crear(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ data: await service.crearServicio(createServicioSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function listar(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarServicios(listarServiciosQuerySchema.parse(req.query)) }); } catch (error) { next(error); }
}
export async function listarDisponibles(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarServiciosDisponibles() }); } catch (error) { next(error); }
}
export async function obtener(req: Request, res: Response, next: NextFunction) {
    try { const { id } = servicioParamsSchema.parse(req.params); res.json({ data: await service.obtenerServicio(id) }); } catch (error) { next(error); }
}
export async function actualizar(req: Request, res: Response, next: NextFunction) {
    try { const { id } = servicioParamsSchema.parse(req.params); res.json({ data: await service.actualizarServicio(id, updateServicioSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function actualizarEstado(req: Request, res: Response, next: NextFunction) {
    try { const { id } = servicioParamsSchema.parse(req.params); const { activo } = updateEstadoServicioSchema.parse(req.body); res.json({ data: await service.actualizarEstadoServicio(id, activo) }); } catch (error) { next(error); }
}
