import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import {
    createUsuarioSchema,
    usuarioParamsSchema,
    updateUsuarioSchema,
    updateEstadoUsuarioSchema,
} from './usuarios.schema.js';

import * as usuariosService from './usuarios.service.js';

export async function crearUsuario(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const datos =
            createUsuarioSchema.parse(req.body);

        const usuario =
            await usuariosService.crearUsuario(
                datos,
            );

        res.status(201).json({
            data: usuario,
        });
    } catch (error) {
        next(error);
    }
}

export async function listarUsuarios(
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const usuarios =
            await usuariosService.listarUsuarios();

        res.status(200).json({
            data: usuarios,
        });
    } catch (error) {
        next(error);
    }
}

export async function obtenerUsuarioPorId(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { id } =
            usuarioParamsSchema.parse(
                req.params,
            );

        const usuario =
            await usuariosService
                .obtenerUsuarioPorId(id);

        res.status(200).json({
            data: usuario,
        });
    } catch (error) {
        next(error);
    }
}

export async function actualizarUsuario(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { id } =
            usuarioParamsSchema.parse(
                req.params,
            );

        const datos =
            updateUsuarioSchema.parse(
                req.body,
            );

        const usuario =
            await usuariosService
                .actualizarUsuario(
                    id,
                    datos,
                );

        res.status(200).json({
            data: usuario,
        });
    } catch (error) {
        next(error);
    }
}

export async function actualizarEstadoUsuario(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { id } =
            usuarioParamsSchema.parse(
                req.params,
            );

        const { activo } =
            updateEstadoUsuarioSchema.parse(
                req.body,
            );

        const usuario =
            await usuariosService
                .actualizarEstadoUsuario(
                    id,
                    activo,
                );

        res.status(200).json({
            data: usuario,
        });
    } catch (error) {
        next(error);
    }
}