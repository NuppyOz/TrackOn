import type { NextFunction, Request, Response } from 'express';
import { publishRealtime } from '../infrastructure/realtime.js';
import { invalidateCache } from '../infrastructure/cache.js';

const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function realtimeSignals(req: Request, res: Response, next: NextFunction) {
    res.once('finish', () => {
        if (!mutatingMethods.has(req.method) || res.statusCode >= 400) return;
        const resource = new URL(req.originalUrl, 'http://localhost').pathname.split('/').filter(Boolean)[1] ?? 'data';
        if (resource === 'ordenes') void invalidateCache('ordenes', 'dashboard');
        if (resource === 'cuadrillas') void invalidateCache('dashboard');
        publishRealtime({ type: 'data.changed', resource, action: req.method.toLowerCase() });
    });
    next();
}
