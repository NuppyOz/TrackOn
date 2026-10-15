import { prisma } from '../../infrastructure/prisma.js';
import type { CreateMaterialInput, MaterialFilters, UpdateMaterialInput } from './materiales.schema.js';
import { paginaDesde } from '../../shared/pagination.js';

const select = { id: true, codigo: true, nombre: true, unidadMedida: true, activo: true } as const;

export function crearMaterial(datos: CreateMaterialInput) {
    return prisma.material.create({
        data: { ...datos, activo: datos.activo ?? true },
        select,
    });
}
export async function listarMateriales(filtros: MaterialFilters) {
    const items = await prisma.material.findMany({
        where: {
            ...(filtros.estado !== 'todos' ? { activo: filtros.estado === 'activos' } : {}),
            ...(filtros.buscar ? { OR: [
                { codigo: { contains: filtros.buscar, mode: 'insensitive' } },
                { nombre: { contains: filtros.buscar, mode: 'insensitive' } },
            ] } : {}),
        },
        select,
        orderBy: { nombre: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return paginaDesde(items, filtros);
}
export function buscarMaterialPorId(id: number) {
    return prisma.material.findUnique({ where: { id }, select });
}
export function actualizarMaterial(id: number, datos: UpdateMaterialInput) {
    return prisma.material.update({ where: { id }, data: datos, select });
}
export function actualizarEstadoMaterial(id: number, activo: boolean) {
    return prisma.material.update({ where: { id }, data: { activo }, select });
}
