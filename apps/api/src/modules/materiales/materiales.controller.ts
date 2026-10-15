import type { NextFunction, Request, Response } from 'express';
import * as service from './materiales.service.js';
import { createMaterialSchema, listarMaterialesQuerySchema, materialParamsSchema, updateEstadoMaterialSchema, updateMaterialSchema } from './materiales.schema.js';

export async function crear(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json({ data: await service.crearMaterial(createMaterialSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function listar(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarMateriales(listarMaterialesQuerySchema.parse(req.query)) }); } catch (error) { next(error); }
}
export async function listarDisponibles(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listarMaterialesDisponibles() }); } catch (error) { next(error); }
}
export async function obtener(req: Request, res: Response, next: NextFunction) {
    try { const { id } = materialParamsSchema.parse(req.params); res.json({ data: await service.obtenerMaterial(id) }); } catch (error) { next(error); }
}
export async function actualizar(req: Request, res: Response, next: NextFunction) {
    try { const { id } = materialParamsSchema.parse(req.params); res.json({ data: await service.actualizarMaterial(id, updateMaterialSchema.parse(req.body)) }); } catch (error) { next(error); }
}
export async function actualizarEstado(req: Request, res: Response, next: NextFunction) {
    try { const { id } = materialParamsSchema.parse(req.params); const { activo } = updateEstadoMaterialSchema.parse(req.body); res.json({ data: await service.actualizarEstadoMaterial(id, activo) }); } catch (error) { next(error); }
}
