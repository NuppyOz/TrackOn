import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Registra metadatos seguros por solicitud; no inspecciona bodies ni headers sensibles. */
export function requestObservability(req: Request, res: Response, next: NextFunction) {
    const requestId = req.header('x-request-id')?.slice(0, 100) || randomUUID();
    const inicio = performance.now();
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
        console.info(JSON.stringify({
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs: Math.round(performance.now() - inicio),
        }));
    });
    next();
}
