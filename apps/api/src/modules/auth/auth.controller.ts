import type {
    Request,
    Response,
    NextFunction,
} from 'express';

import { AppError } from '../../errors/AppError.js';

import { loginSchema } from './auth.schema.js';

import { refreshSession, logoutSession } from './auth.service.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE_MAX_AGE =
    7 * 24 * 60 * 60 * 1000;

export async function login(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const datos =
            loginSchema.parse(req.body);

        const resultado =
            await authService.login(datos);

        res.cookie(
            'trackon_refresh',
            resultado.refreshToken,
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    'production',
                sameSite: 'strict',
                path: '/api/auth',
                maxAge:
                    REFRESH_COOKIE_MAX_AGE,
            },
        );

        res.status(200).json({
            data: {
                accessToken:
                    resultado.accessToken,

                tokenType: 'Bearer',

                expiresIn:
                    resultado.expiresIn,

                usuario:
                    resultado.usuario,
            },
        });
    } catch (error) {
        next(error);
    }
}

function getCookie(
    cookieHeader: string | undefined,
    cookieName: string,
): string | undefined {
    if (!cookieHeader) {
        return undefined;
    }

    const cookies =
        cookieHeader.split(';');

    for (const cookie of cookies) {
        const [name, ...valueParts] =
            cookie.trim().split('=');

        if (name === cookieName) {
            return valueParts.join('=');
        }
    }

    return undefined;
}

export async function refresh(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const refreshToken = getCookie(
            req.headers.cookie,
            'trackon_refresh',
        );

        if (!refreshToken) {
            throw new AppError(
                401,
                'La sesión no es válida.',
            );
        }

        const result =
            await refreshSession(
                refreshToken,
            );

        res.status(200).json({
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const refreshToken = getCookie(
            req.headers.cookie,
            'trackon_refresh',
        );

        await logoutSession(refreshToken);

        res.clearCookie(
            'trackon_refresh',
            {
                httpOnly: true,
                secure:
                    process.env.NODE_ENV ===
                    'production',
                sameSite: 'strict',
                path: '/api/auth',
            },
        );

        res.status(204).send();
    } catch (error) {
        next(error);
    }
}