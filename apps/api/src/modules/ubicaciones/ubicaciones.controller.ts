import type { Request, Response, NextFunction } from "express";

import * as service from "./ubicaciones.service.js";

import {
    createUbicacionSchema,
    listarUbicacionesQuerySchema,
    ubicacionParamsSchema,
    updateUbicacionSchema,
    updateEstadoUbicacionSchema,
} from "./ubicaciones.schema.js";

export async function crear(req: Request, res: Response, next: NextFunction) {
    try {
        const datos = createUbicacionSchema.parse(req.body);

        const ubicacion = await service.crear(datos);

        res.status(201).json({
            data: ubicacion,
        });
    } catch (error) {
        next(error);
    }
}

export async function listar(req: Request, res: Response, next: NextFunction) {
    try {
        const filtros = listarUbicacionesQuerySchema.parse(req.query);

        const ubicaciones = await service.listar(filtros);

        res.status(200).json({
            data: ubicaciones,
        });
    } catch (error) {
        next(error);
    }
}

export async function obtener(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = ubicacionParamsSchema.parse(req.params);

        const ubicacion = await service.obtener(id);

        res.status(200).json({
            data: ubicacion,
        });
    } catch (error) {
        next(error);
    }
}

export async function actualizar(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = ubicacionParamsSchema.parse(req.params);

        const datos = updateUbicacionSchema.parse(req.body);

        const ubicacion = await service.actualizar(id, datos);

        res.status(200).json({
            data: ubicacion,
        });
    } catch (error) {
        next(error);
    }
}

export async function cambiarEstado(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = ubicacionParamsSchema.parse(req.params);

        const { activa } = updateEstadoUbicacionSchema.parse(req.body);

        const ubicacion = await service.cambiarEstado(id, activa);

        res.status(200).json({
            data: ubicacion,
        });
    } catch (error) {
        next(error);
    }
}
