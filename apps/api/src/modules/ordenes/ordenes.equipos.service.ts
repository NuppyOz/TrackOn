import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as repository from './ordenes.equipos.repository.js';
import type { RegistrarDiagnosticoInput } from './ordenes.equipos.schema.js';

function traducirConflicto(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new AppError(409, 'La información cambió durante la operación. Inténtalo nuevamente.');
    }
    throw error;
}

export function listar(ordenId: number) {
    return repository.listarVinculados(ordenId);
}

export function listarDisponibles(ordenId: number) {
    return repository.disponibles(ordenId);
}

export async function vincular(ordenId: number, equipoId: number) {
    try {
        return await repository.vincular(ordenId, equipoId);
    } catch (error) {
        return traducirConflicto(error);
    }
}

export async function registrarDiagnostico(
    ordenId: number,
    registroId: number,
    datos: RegistrarDiagnosticoInput,
    actor: { id: number; empleadoId: number; rol: string },
) {
    try {
        return await repository.guardarDiagnostico(ordenId, registroId, datos, actor);
    } catch (error) {
        return traducirConflicto(error);
    }
}
