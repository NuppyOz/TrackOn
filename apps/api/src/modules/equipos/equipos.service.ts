import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as repository from './equipos.repository.js';
import type { CreateEquipoInput, EquipoFilters, UpdateEquipoInput } from './equipos.schema.js';

async function validarUbicacion(ubicacionId: number) {
    if (!await repository.buscarUbicacionValida(ubicacionId)) {
        throw new AppError(400, 'La ubicación no existe, está inactiva o pertenece a un cliente inactivo.');
    }
}

function traducirErrorPersistencia(error: unknown): never {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2002') {
        throw new AppError(409, 'Ya existe un equipo con el mismo código.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2025') {
        throw new AppError(404, 'El equipo no existe.');
    }
    throw error;
}

export async function crearEquipo(datos: CreateEquipoInput) {
    await validarUbicacion(datos.ubicacionId);
    try { return await repository.crearEquipo(datos); } catch (error) { traducirErrorPersistencia(error); }
}

export function listarEquipos(filtros: EquipoFilters) { return repository.listarEquipos(filtros); }
export function listarUbicacionesActivas() { return repository.listarUbicacionesActivas(); }

export async function obtenerEquipo(id: number) {
    const equipo = await repository.buscarEquipoPorId(id);
    if (!equipo) throw new AppError(404, 'El equipo no existe.');
    return equipo;
}

export async function actualizarEquipo(id: number, datos: UpdateEquipoInput) {
    await obtenerEquipo(id);
    if (datos.ubicacionId !== undefined) await validarUbicacion(datos.ubicacionId);
    try { return await repository.actualizarEquipo(id, datos); } catch (error) { traducirErrorPersistencia(error); }
}

export async function actualizarEstadoEquipo(id: number, activo: boolean) {
    await obtenerEquipo(id);
    try { return await repository.actualizarEstadoEquipo(id, activo); } catch (error) { traducirErrorPersistencia(error); }
}
