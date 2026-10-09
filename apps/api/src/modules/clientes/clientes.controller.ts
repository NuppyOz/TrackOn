import type { Request, Response, NextFunction } from "express";

import {
    createClienteSchema,
    clienteParamsSchema,
    updateClienteSchema,
    updateEstadoClienteSchema,
} from "./clientes.schema.js";

import * as clientesService from "./clientes.service.js";

export async function crearCliente(req: Request, res: Response, next: NextFunction) {
    try {
        const datos = createClienteSchema.parse(req.body);

        const cliente = await clientesService.crearCliente(datos);

        res.status(201).json({
            data: cliente,
        });
    } catch (error) {
        next(error);
    }
}

export async function listarClientes(_req: Request, res: Response, next: NextFunction) {
    try {
        const clientes = await clientesService.listarClientes();

        res.status(200).json({
            data: clientes,
        });
    } catch (error) {
        next(error);
    }
}

export async function obtenerClientePorId(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = clienteParamsSchema.parse(req.params);

        const cliente = await clientesService.obtenerClientePorId(id);

        res.status(200).json({
            data: cliente,
        });
    } catch (error) {
        next(error);
    }
}


export async function actualizarEstadoCliente(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = clienteParamsSchema.parse(req.params);

        const { activo } = updateEstadoClienteSchema.parse(req.body);

        const cliente = await clientesService.actualizarEstadoCliente(id, activo);

        res.status(200).json({
            data: cliente,
        });
    } catch (error) {
        next(error);
    }
}

export async function actualizarCliente(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { id } =
            clienteParamsSchema.parse(
                req.params,
            );

        const datos =
            updateClienteSchema.parse(
                req.body,
            );

        const cliente =
            await clientesService.actualizarCliente(
                id,
                datos,
            );

        res.status(200).json({
            data: cliente,
        });
    } catch (error) {
        next(error);
    }
}