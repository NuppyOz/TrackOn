import { prisma } from '../../infrastructure/prisma.js';
import type { CreateServicioInput, ServicioFilters, UpdateServicioInput } from './servicios.schema.js';
import { paginaDesde } from '../../shared/pagination.js';

const select = { id: true, codigo: true, nombre: true, descripcion: true, activo: true } as const;

export function crearServicio(datos: CreateServicioInput) {
    return prisma.servicio.create({
        data: { ...datos, descripcion: datos.descripcion ?? null, activo: datos.activo ?? true },
        select,
    });
}
export async function listarServicios(filtros: ServicioFilters) {
    const items = await prisma.servicio.findMany({
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
export function buscarServicioPorId(id: number) {
    return prisma.servicio.findUnique({ where: { id }, select });
}
export function actualizarServicio(id: number, datos: UpdateServicioInput) {
    return prisma.servicio.update({ where: { id }, data: datos, select });
}
export function actualizarEstadoServicio(id: number, activo: boolean) {
    return prisma.servicio.update({ where: { id }, data: { activo }, select });
}
