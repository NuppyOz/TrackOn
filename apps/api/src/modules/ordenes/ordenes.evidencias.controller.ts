import type { NextFunction, Request, Response } from 'express';
import { obtenerActorOrden } from './ordenes.actor.js';
import { diagnosticoParamsSchema } from './ordenes.equipos.schema.js';
import { evidenciaParamsSchema, evidenciaSchema, revisarEvidenciaSchema } from './ordenes.evidencias.schema.js';
import * as repository from './ordenes.evidencias.repository.js';
import { AppError } from '../../errors/AppError.js';

export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        res.json({ data: await repository.listar(id, registroId) });
    } catch (error) { next(error); }
}
export async function crear(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId } = diagnosticoParamsSchema.parse(req.params);
        res.status(201).json({ data: await repository.crear(id, registroId, evidenciaSchema.parse(req.body), obtenerActorOrden(req)) });
    } catch (error) { next(error); }
}
export async function cargar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId, evidenciaId } = evidenciaParamsSchema.parse(req.params);
        if (!Buffer.isBuffer(req.body)) throw new AppError(400, 'Envía el archivo como application/octet-stream.');
        res.json({ data: await repository.cargar(id, registroId, evidenciaId, req.body, obtenerActorOrden(req)) });
    } catch (error) { next(error); }
}
export async function descargar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId, evidenciaId } = evidenciaParamsSchema.parse(req.params);
        const { item, contenido } = await repository.descargar(id, registroId, evidenciaId);
        res.set({ 'Content-Type': item.tipoArchivo, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(item.nombreOriginal)}` });
        res.send(contenido);
    } catch (error) { next(error); }
}
export async function revisar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id, registroId, evidenciaId } = evidenciaParamsSchema.parse(req.params);
        res.status(201).json({ data: await repository.revisar(id, registroId, evidenciaId, revisarEvidenciaSchema.parse(req.body), obtenerActorOrden(req)) });
    } catch (error) { next(error); }
}
