import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import {
    createClienteSchema,
} from './clientes.schema.js';

import * as clientesService
    from './clientes.service.js';

export async function crearCliente(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const datos =
            createClienteSchema.parse(
                req.body,
            );

        const cliente =
            await clientesService
                .crearCliente(datos);

        res.status(201).json({
            data: cliente,
        });
    } catch (error) {
        next(error);
    }
}