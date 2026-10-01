import { AppError } from '../../errors/AppError.js';

import { verifyPassword } from '../../security/password.js';

import {
    generateRefreshToken,
    hashRefreshToken,
    calculateRefreshExpiration,
} from '../../security/refresh-tokens.js';

import {
    createAccessToken,
    ACCESS_TOKEN_SECONDS,
} from '../../security/access-token.js';

import type {
    VerifiedAccessToken,
} from '../../security/access-token.js';

import * as authRepository from './auth.repository.js';

import type {
    LoginInput,
} from './auth.schema.js';

export async function login(
    datos: LoginInput,
) {
    const usuario =
        await authRepository.buscarUsuarioParaLogin(
            datos.identificador,
        );

    if (!usuario) {
        throw new AppError(
            401,
            'Identificador o contraseña incorrectos.',
        );
    }

    const passwordValida =
        await verifyPassword(
            datos.password,
            usuario.passwordHash,
        );

    if (!passwordValida) {
        throw new AppError(
            401,
            'Identificador o contraseña incorrectos.',
        );
    }

    if (!usuario.activo) {
        throw new AppError(
            403,
            'La cuenta de usuario está desactivada.',
        );
    }

    if (!usuario.empleado.active) {
        throw new AppError(
            403,
            'El empleado está inactivo.',
        );
    }

    if (
        usuario.rol.cod === 'TEC' &&
        !usuario.empleado.habilitadoComoTecnico
    ) {
        throw new AppError(
            403,
            'El empleado no está habilitado para acceder como técnico.',
        );
    }

    const refreshToken =
        generateRefreshToken();

    const tokenRenovacionHash =
        hashRefreshToken(refreshToken);

    const expiraEn =
        calculateRefreshExpiration();

    const sesion =
        await authRepository.crearSesion(
            usuario.id,
            tokenRenovacionHash,
            expiraEn,
        );

    const accessToken =
        await createAccessToken({
            usuarioId: usuario.id,
            sesionId: sesion.id,
            rol: usuario.rol.cod,
        });

    return {
        accessToken,
        expiresIn: ACCESS_TOKEN_SECONDS,
        refreshToken,

        usuario: {
            id: usuario.id,
            identificador:
                usuario.identificador,

            rol: usuario.rol,

            empleado: usuario.empleado,
        },
    };
}

export async function refreshSession(
    refreshToken: string,
) {
    const tokenHash =
        hashRefreshToken(refreshToken);

    const session =
        await authRepository.findSessionByRefreshTokenHash(
            tokenHash,
        );

    if (!session) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    if (session.revocadaEn) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    if (session.expiraEn <= new Date()) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    const { usuario } = session;

    if (!usuario.activo) {
        throw new AppError(
            403,
            'La cuenta de usuario está desactivada.',
        );
    }

    if (!usuario.empleado.active) {
        throw new AppError(
            403,
            'El empleado está inactivo.',
        );
    }

    if (
        usuario.rol.cod === 'TEC' &&
        !usuario.empleado.habilitadoComoTecnico
    ) {
        throw new AppError(
            403,
            'El empleado no está habilitado como técnico.',
        );
    }

    const accessToken =
        await createAccessToken({
            usuarioId: usuario.id,
            sesionId: session.id,
            rol: usuario.rol.cod,
        });

        return {
        accessToken,
        tokenType: 'Bearer' as const,
        expiresIn: ACCESS_TOKEN_SECONDS,

        usuario: {
            id: usuario.id,
            identificador:
                usuario.identificador,

            rol: usuario.rol,

            empleado: usuario.empleado,
        },
    };
}

export async function logoutSession(
    refreshToken: string | undefined,
) {
    if (!refreshToken) {
        return;
    }

    const tokenHash =
        hashRefreshToken(refreshToken);

    await authRepository.revokeSessionByRefreshTokenHash(
        tokenHash,
    );
}

export async function validarSesionAutenticada(
    token: VerifiedAccessToken,
) {
    const sesion =
        await authRepository.buscarSesionParaAutenticacion(
            token.sesionId,
        );

    if (!sesion) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    if (sesion.revocadaEn) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    if (sesion.expiraEn <= new Date()) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    const { usuario } = sesion;

    if (usuario.id !== token.usuarioId) {
        throw new AppError(
            401,
            'La sesión no es válida.',
        );
    }

    if (!usuario.activo) {
        throw new AppError(
            403,
            'La cuenta de usuario está desactivada.',
        );
    }

    if (!usuario.empleado.active) {
        throw new AppError(
            403,
            'El empleado está inactivo.',
        );
    }

    if (
        usuario.rol.cod === 'TEC' &&
        !usuario.empleado.habilitadoComoTecnico
    ) {
        throw new AppError(
            403,
            'El empleado no está habilitado como técnico.',
        );
    }

    return {
        sesionId: sesion.id,

        usuario: {
            id: usuario.id,
            identificador:
                usuario.identificador,

            rol: usuario.rol,

            empleado: usuario.empleado,
        },
    };
}