import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../errors/AppError.js';
import * as empleadosRepository from './empleados.repository.js';
import type { CreateEmpleadoInput } from './empleados.schema.js';
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