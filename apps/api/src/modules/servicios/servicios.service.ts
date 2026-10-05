import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as repository from './servicios.repository.js';
import type { CreateServicioInput, ServicioFilters, UpdateServicioInput } from './servicios.schema.js';

function traducirError(error: unknown): never {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2002') {
        throw new AppError(409, 'Ya existe un servicio con el mismo código.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2025') {
        throw new AppError(404, 'El servicio no existe.');
    }
    throw error;
}

export async function crearServicio(datos: CreateServicioInput) {
    try { return await repository.crearServicio(datos); } catch (error) { traducirError(error); }
}
export function listarServicios(filtros: ServicioFilters) { return repository.listarServicios(filtros); }
export function listarServiciosDisponibles() {
    return repository.listarServicios({ estado: 'activos', pagina: 1, limite: 100 });
}
export async function obtenerServicio(id: number) {
    const servicio = await repository.buscarServicioPorId(id);
    if (!servicio) throw new AppError(404, 'El servicio no existe.');
    return servicio;
}
export async function actualizarServicio(id: number, datos: UpdateServicioInput) {
    await obtenerServicio(id);
    try { return await repository.actualizarServicio(id, datos); } catch (error) { traducirError(error); }
}
export async function actualizarEstadoServicio(id: number, activo: boolean) {
    await obtenerServicio(id);
    try { return await repository.actualizarEstadoServicio(id, activo); } catch (error) { traducirError(error); }
}
