import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';
import * as repository from './materiales.repository.js';
import type { CreateMaterialInput, MaterialFilters, UpdateMaterialInput } from './materiales.schema.js';

function traducirError(error: unknown): never {
    const prismaError = error as Prisma.PrismaClientKnownRequestError;
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2002') {
        throw new AppError(409, 'Ya existe un material con el mismo código.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && prismaError.code === 'P2025') {
        throw new AppError(404, 'El material no existe.');
    }
    throw error;
}

export async function crearMaterial(datos: CreateMaterialInput) {
    try { return await repository.crearMaterial(datos); } catch (error) { traducirError(error); }
}
export function listarMateriales(filtros: MaterialFilters) { return repository.listarMateriales(filtros); }
export function listarMaterialesDisponibles() {
    return repository.listarMateriales({ estado: 'activos', pagina: 1, limite: 100 });
}
export async function obtenerMaterial(id: number) {
    const material = await repository.buscarMaterialPorId(id);
    if (!material) throw new AppError(404, 'El material no existe.');
    return material;
}
export async function actualizarMaterial(id: number, datos: UpdateMaterialInput) {
    await obtenerMaterial(id);
    try { return await repository.actualizarMaterial(id, datos); } catch (error) { traducirError(error); }
}
export async function actualizarEstadoMaterial(id: number, activo: boolean) {
    await obtenerMaterial(id);
    try { return await repository.actualizarEstadoMaterial(id, activo); } catch (error) { traducirError(error); }
}
