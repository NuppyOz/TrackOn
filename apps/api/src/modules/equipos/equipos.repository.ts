import { prisma } from '../../infrastructure/prisma.js';
import type { CreateEquipoInput, EquipoFilters, UpdateEquipoInput } from './equipos.schema.js';
import { paginaDesde } from '../../shared/pagination.js';

const equipoSelect = {
    id: true,
    codigo: true,
    tipo: true,
    marca: true,
    modelo: true,
    numeroSerie: true,
    activo: true,
    creadoEn: true,
    actualizadoEn: true,
    ubicacion: {
        select: {
            id: true,
            nombre: true,
            direccion: true,
            activa: true,
            cliente: {
                select: {
                    id: true,
                    codigo: true,
                    activo: true,
                    persona: { select: { firstName: true, firstLastName: true } },
                    organizacion: { select: { razonSocial: true, nombreComercial: true } },
                },
            },
        },
    },
} as const;

export function crearEquipo(datos: CreateEquipoInput) {
    return prisma.equipo.create({
        data: {
            ubicacionId: datos.ubicacionId,
            codigo: datos.codigo,
            tipo: datos.tipo,
            marca: datos.marca ?? null,
            modelo: datos.modelo ?? null,
            numeroSerie: datos.numeroSerie ?? null,
            activo: datos.activo ?? true,
        },
        select: equipoSelect,
    });
}

export async function listarEquipos(filtros: EquipoFilters) {
    const items = await prisma.equipo.findMany({
        where: {
            ...(filtros.estado !== 'todos' ? { activo: filtros.estado === 'activos' } : {}),
            ...(filtros.ubicacionId ? { ubicacionId: filtros.ubicacionId } : {}),
            ...(filtros.clienteId ? { ubicacion: { clienteId: filtros.clienteId } } : {}),
            ...(filtros.codigo ? { codigo: { contains: filtros.codigo, mode: 'insensitive' } } : {}),
            ...(filtros.numeroSerie ? { numeroSerie: { contains: filtros.numeroSerie, mode: 'insensitive' } } : {}),
        },
        select: equipoSelect,
        orderBy: { codigo: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return paginaDesde(items, filtros);
}

export function buscarEquipoPorId(id: number) {
    return prisma.equipo.findUnique({ where: { id }, select: equipoSelect });
}

export function buscarUbicacionValida(id: number) {
    return prisma.ubicacion.findFirst({
        where: { id, activa: true, cliente: { activo: true } },
        select: { id: true },
    });
}

export function listarUbicacionesActivas() {
    return prisma.ubicacion.findMany({
        where: { activa: true, cliente: { activo: true } },
        select: {
            id: true,
            nombre: true,
            direccion: true,
            cliente: {
                select: {
                    id: true,
                    codigo: true,
                    persona: { select: { firstName: true, firstLastName: true } },
                    organizacion: { select: { razonSocial: true, nombreComercial: true } },
                },
            },
        },
        orderBy: [{ cliente: { codigo: 'asc' } }, { nombre: 'asc' }],
    });
}

export function actualizarEquipo(id: number, datos: UpdateEquipoInput) {
    return prisma.equipo.update({ where: { id }, data: datos, select: equipoSelect });
}

export function actualizarEstadoEquipo(id: number, activo: boolean) {
    return prisma.equipo.update({ where: { id }, data: { activo }, select: equipoSelect });
}
