import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../errors/AppError.js";

import * as service from "./notificaciones.service.js";

import { notificationParams, notificationQuery } from "./notificaciones.schema.js";

function obtenerUsuarioId(req: Request): number {
    if (!req.auth) {
        throw new AppError(401, "Se requiere autenticación.");
    }

    return req.auth.usuario.id;
}

export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = obtenerUsuarioId(req);

        res.json({
            data: await service.listar(usuarioId, notificationQuery.parse(req.query)),
        });
    } catch (error) {
        next(error);
    }
}

export async function contarNoLeidas(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = obtenerUsuarioId(req);

        res.json({
            data: {
                noLeidas: await service.contarNoLeidas(usuarioId),
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function marcarLeida(req: Request, res: Response, next: NextFunction) {
    try {
        const usuarioId = obtenerUsuarioId(req);

        const { id } = notificationParams.parse(req.params);

        res.json({
            data: await service.marcarLeida(usuarioId, id),
        });
    } catch (error) {
        next(error);
    }
}
