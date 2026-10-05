import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import { hashPassword } from '../../security/password.js';

import * as usuariosRepository from './usuarios.repository.js';

import type {
    CreateUsuarioInput,
    UpdateUsuarioInput,
} from './usuarios.schema.js';

export async function crearUsuario(
    datos: CreateUsuarioInput,
) {
    const empleado =
        await usuariosRepository.buscarEmpleadoParaUsuario(
            datos.empleadoId,
        );

    if (!empleado) {
        throw new AppError(
            404,
            'El empleado no existe.',
        );
    }

    if (!empleado.active) {
        throw new AppError(
            409,
            'No se puede crear un usuario para un empleado inactivo.',
        );
    }

    if (empleado.usuario) {
        throw new AppError(
            409,
            'El empleado ya tiene una cuenta de usuario.',
        );
    }

    const rol =
        await usuariosRepository.buscarRolPorId(
            datos.rolId,
        );

    if (!rol) {
        throw new AppError(
            404,
            'El rol no existe.',
        );
    }

    if (
        rol.cod === 'TEC' &&
        !empleado.habilitadoComoTecnico
    ) {
        throw new AppError(
            409,
            'El empleado debe estar habilitado como técnico para recibir el rol TEC.',
        );
    }

    const usuarioExistente =
        await usuariosRepository.buscarUsuarioPorIdentificador(
            datos.identificador,
        );

    if (usuarioExistente) {
        throw new AppError(
            409,
            'El identificador ya está siendo utilizado.',
        );
    }

    const passwordHash =
        await hashPassword(datos.password);

    try {
        return await usuariosRepository.crearUsuario({
            empleadoId: datos.empleadoId,
            rolId: datos.rolId,
            identificador: datos.identificador,
            passwordHash,
        });
    } catch (error) {
        if (
            error instanceof
                Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new AppError(
                409,
                'El usuario entra en conflicto con un registro existente.',
            );
        }

        throw error;
    }
}

export function listarUsuarios() {
    return usuariosRepository.listarUsuarios();
}

export async function obtenerUsuarioPorId(
    id: number,
) {
    const usuario =
        await usuariosRepository.buscarUsuarioPorId(id);

    if (!usuario) {
        throw new AppError(
            404,
            'El usuario no existe.',
        );
    }

    return usuario;
}

export async function actualizarUsuario(
    id: number,
    datos: UpdateUsuarioInput,
) {
    const usuarioActual =
        await usuariosRepository.buscarUsuarioPorId(id);

    if (!usuarioActual) {
        throw new AppError(
            404,
            'El usuario no existe.',
        );
    }

    if (
        datos.identificador !== undefined &&
        datos.identificador !==
            usuarioActual.identificador
    ) {
        const usuarioConIdentificador =
            await usuariosRepository
                .buscarUsuarioPorIdentificador(
                    datos.identificador,
                );

        if (
            usuarioConIdentificador &&
            usuarioConIdentificador.id !== id
        ) {
            throw new AppError(
                409,
                'El identificador ya está siendo utilizado.',
            );
        }
    }

    if (datos.rolId !== undefined) {
        const rol =
            await usuariosRepository.buscarRolPorId(
                datos.rolId,
            );

        if (!rol) {
            throw new AppError(
                404,
                'El rol no existe.',
            );
        }

        if (rol.cod === 'TEC') {
            if (!usuarioActual.empleado.active) {
                throw new AppError(
                    409,
                    'No se puede asignar el rol TEC a un empleado inactivo.',
                );
            }

            if (
                !usuarioActual.empleado
                    .habilitadoComoTecnico
            ) {
                throw new AppError(
                    409,
                    'El empleado debe estar habilitado como técnico para recibir el rol TEC.',
                );
            }
        }
    }

    try {
        return await usuariosRepository.actualizarUsuario(
            id,
            datos,
        );
    } catch (error) {
        if (
            error instanceof
                Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new AppError(
                409,
                'El usuario entra en conflicto con un registro existente.',
            );
        }

        if (
            error instanceof
                Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new AppError(
                404,
                'El usuario no existe.',
            );
        }

        throw error;
    }
}

export async function actualizarEstadoUsuario(
    id: number,
    activo: boolean,
) {
    const usuario =
        await usuariosRepository.buscarUsuarioPorId(id);

    if (!usuario) {
        throw new AppError(
            404,
            'El usuario no existe.',
        );
    }

    if (activo) {
        if (!usuario.empleado.active) {
            throw new AppError(
                409,
                'No se puede activar la cuenta de un empleado inactivo.',
            );
        }

        if (
            usuario.rol.cod === 'TEC' &&
            !usuario.empleado.habilitadoComoTecnico
        ) {
            throw new AppError(
                409,
                'No se puede activar un usuario TEC si el empleado no está habilitado como técnico.',
            );
        }
    }

    try {
        return await usuariosRepository
            .actualizarEstadoUsuario(
                id,
                activo,
            );
    } catch (error) {
        if (
            error instanceof
                Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new AppError(
                404,
                'El usuario no existe.',
            );
        }

        throw error;
    }
}
