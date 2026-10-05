import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as empleadosRepository from './empleados.repository.js';
import type { CreateEmpleadoInput, UpdateEmpleadoInput } from './empleados.schema.js';
import { createPersonaSchema } from '../personas/personas.schema.js'
import type { NextFunction, Response } from 'express';

export async function crearEmpleado(datos:CreateEmpleadoInput) {
    try{
        return await empleadosRepository.crearEmpleado(datos)
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new AppError (
                409, 'El empleado entra en conflicto con un registro existente. Revisa el código de empleado'
            )
        }
        throw error
    }
}

export function listarEmpleados(){
    return empleadosRepository.listarEmpleados()
}

export async function obtenerEmpleadoPorId(id: number) {
    const empleado =
        await empleadosRepository.buscarEmpleadoPorId(id);

    if (!empleado) {
        throw new AppError(404, 'El empleado no existe.');
    }

    return empleado;
}

export async function actualizarEmpleado(
    id: number,
    datos: UpdateEmpleadoInput,
) {
    const empleadoActual =
        await empleadosRepository.buscarEmpleadoPorId(id);

    if (!empleadoActual) {
        throw new AppError(404, 'El empleado no existe.');
    }

    if (datos.persona !== undefined) {
        const personaActual = empleadoActual.persona;
        const cambios = datos.persona;

        createPersonaSchema.parse({
            firstName:
                cambios.firstName !== undefined
                    ? cambios.firstName
                    : personaActual.firstName,

            secondName:
                cambios.secondName !== undefined
                    ? cambios.secondName
                    : personaActual.secondName,

            firstLastName:
                cambios.firstLastName !== undefined
                    ? cambios.firstLastName
                    : personaActual.firstLastName,

            secondLastName:
                cambios.secondLastName !== undefined
                    ? cambios.secondLastName
                    : personaActual.secondLastName,

            typeDocument:
                cambios.typeDocument !== undefined
                    ? cambios.typeDocument
                    : personaActual.typeDocument,

            numberDocument:
                cambios.numberDocument !== undefined
                    ? cambios.numberDocument
                    : personaActual.numberDocument,

            telephone:
                cambios.telephone !== undefined
                    ? cambios.telephone
                    : personaActual.telephone,

            correo:
                cambios.correo !== undefined
                    ? cambios.correo
                    : personaActual.correo,
        });
    }

    try {
        return await empleadosRepository.actualizarEmpleado(
            id,
            datos,
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            throw new AppError(
                409,
                'El código de empleado ya está siendo utilizado.',
            );
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new AppError(404, 'El empleado no existe.');
        }

        throw error;
    }
}

export async function actualizarEstadoEmpleado(
    id: number,
    active: boolean,
) {
    const empleado =
        await empleadosRepository.buscarEmpleadoPorId(id);

    if (!empleado) {
        throw new AppError(404, 'El empleado no existe.');
    }

    try {
        return await empleadosRepository.actualizarEstadoEmpleado(
            id,
            active,
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new AppError(404, 'El empleado no existe.')
        }

        throw error;
    }
}

export async function actualizarHabilitacionTecnica(
    id: number,
    habilitadoComoTecnico: boolean,
) {
    const empleado =
        await empleadosRepository.buscarEmpleadoPorId(id);

    if (!empleado) {
        throw new AppError(404, 'El empleado no existe.');
    }

    if (!empleado.active && habilitadoComoTecnico) {
        throw new AppError(409,
            'No se puede habilitar como técnico a un empleado inactivo'
        );
    }

    try {
        return await empleadosRepository.actualizarHabilitacionTecnica(
            id,
            habilitadoComoTecnico,
        );
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new AppError(404, 'El empleado no existe.');
        }

        throw error;
    }
}
