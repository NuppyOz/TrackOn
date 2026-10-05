import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import { AppError } from '../errors/AppError.js';

import type {
    RoleCode,
} from '../security/roles.js';

export function authorize(
    ...rolesPermitidos: RoleCode[]
) {
    return function authorizeByRole(
        req: Request,
        _res: Response,
        next: NextFunction,
    ) {
        if (!req.auth) {
            next(
                new AppError(
                    401,
                    'Se requiere autenticación.',
                ),
            );
            return;
        }

        const rolActual =
            req.auth.usuario.rol.cod;

        const permitido =
            rolesPermitidos.some(
                (rol) =>
                    rol === rolActual,
            );

        if (!permitido) {
            next(
                new AppError(
                    403,
                    'No tienes permisos para realizar esta acción.',
                ),
            );
            return;
        }

        next();
    };
}