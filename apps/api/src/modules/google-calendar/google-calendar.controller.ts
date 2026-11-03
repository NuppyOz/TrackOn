import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import { enqueueBackgroundJob } from '../../infrastructure/background-jobs.js';
import { googleCallbackSchema, syncCalendarSchema } from './google-calendar.schema.js';
import * as service from './google-calendar.service.js';

function userId(req: Request) {
    if (!req.auth) throw new AppError(401, 'Se requiere autenticación.');
    return req.auth.usuario.id;
}

export async function status(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.status(userId(req)) }); }
    catch (error) { next(error); }
}

export async function connect(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.authorizationUrl(userId(req)) }); }
    catch (error) { next(error); }
}

export async function callback(req: Request, res: Response) {
    try {
        const query = googleCallbackSchema.parse(req.query);
        if (query.error) throw new AppError(400, 'Google canceló o rechazó la autorización.');
        if (!query.code || !query.state) throw new AppError(400, 'La respuesta de Google está incompleta.');
        const webAppUrl = await service.completeAuthorization(query.code, query.state);
        res.redirect(`${webAppUrl}/agenda?google=connected`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo conectar Google Calendar.';
        const base = process.env.WEB_APP_URL ?? 'http://localhost:5173';
        res.redirect(`${base}/agenda?google=error&message=${encodeURIComponent(message)}`);
    }
}

export async function disconnect(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await service.disconnect(userId(req)) }); }
    catch (error) { next(error); }
}

export function sync(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = userId(req);
        const { dia } = syncCalendarSchema.parse(req.body);
        const jobId = enqueueBackgroundJob(usuarioId, 'calendar.sync', () => service.syncDay(usuarioId, dia));
        res.status(202).json({ data: { jobId, estado: 'encolado' } });
    } catch (error) { next(error); }
}
