import type { NextFunction, Request, Response } from 'express';
import * as service from './notificaciones.service.js';
import { notificationParams, notificationQuery } from './notificaciones.schema.js';

export async function listar(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.listar(res.locals.usuarioId as number, notificationQuery.parse(req.query)) }); }
    catch (error) { next(error); }
}

export async function contarNoLeidas(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: { noLeidas: await service.contarNoLeidas(res.locals.usuarioId as number) } }); }
    catch (error) { next(error); }
}

export async function marcarLeida(req: Request, res: Response, next: NextFunction) {
    try { const { id } = notificationParams.parse(req.params); res.json({ data: await service.marcarLeida(res.locals.usuarioId as number, id) }); }
    catch (error) { next(error); }
}
