import type {
    Request,
    Response,
    NextFunction
} from 'express';

import { AppError } from '../errors/AppError.js';

import { verifyAccessToken } from '../security/access-token.js';

import { validarSesionAutenticada } from '../modules/auth/auth.service.js';

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const authorization =
        req.headers.authorization;

    if (!authorization) {
        next(
            new AppError(
                401,
                'Se requiere autenticación.',
            ),
        );
        return;
    }

    const parts =
        authorization.trim().split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0]?.toLowerCase() !== 'bearer' ||
        !parts[1]
    ) {
        next(
            new AppError(
                401,
                'El token de acceso no es válido.',
            ),
        );
        return;
    }

    const accessToken = parts[1];

    let tokenVerificado;

    try {
        tokenVerificado =
            await verifyAccessToken(
                accessToken,
            );
    } catch {
        next(
            new AppError(
                401,
                'El token de acceso no es válido.',
            ),
        );
        return;
    }

    try {
        const autenticacion =
            await validarSesionAutenticada(
                tokenVerificado,
            );

        req.auth = autenticacion;

        next();
    } catch (error) {
        next(error);
    }
}