import { prisma } from '../../infrastructure/prisma.js';
import { Prisma } from '@prisma/client';
import { paginaDesde } from '../../shared/pagination.js';
import type { CreateCuadrillaInput, CuadrillaFilters, UpdateCuadrillaInput } from './cuadrillas.schema.js';

const personaSelect = { firstName: true, secondName: true, firstLastName: true, secondLastName: true } as const;
const empleadoSelect = {
    id: true, codEmpleado: true, active: true, habilitadoComoTecnico: true,
    persona: { select: personaSelect },
    usuario: { select: { activo: true, rol: { select: { cod: true, nombre: true } } } },
} as const;

const miembroSelect = {
    id: true, empleadoId: true, esLider: true, inicio: true, fin: true,
    empleado: { select: empleadoSelect },
} as const;

const cuadrillaSelect = {
    id: true, nombre: true, activa: true, creadaEn: true,
    miembros: { select: miembroSelect, orderBy: [{ fin: 'asc' }, { inicio: 'desc' }] },
} satisfies Prisma.CuadrillaSelect;

export function crearCuadrilla(datos: CreateCuadrillaInput) {
    return prisma.cuadrilla.create({ data: { nombre: datos.nombre, activa: datos.activa ?? true }, select: cuadrillaSelect });
}

export async function listarCuadrillas(filtros: CuadrillaFilters) {
    let estadoWhere: Prisma.CuadrillaWhereInput = {};
    if (filtros.estado === 'activas') estadoWhere = { activa: true };
    else if (filtros.estado === 'inactivas') estadoWhere = { activa: false };

    const items = await prisma.cuadrilla.findMany({
        where: {
            ...estadoWhere,
            ...(filtros.nombre ? { nombre: { contains: filtros.nombre, mode: 'insensitive' } } : {}),
        },
        select: cuadrillaSelect,
        orderBy: { nombre: 'asc' },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return paginaDesde(items, filtros);
}

export function buscarCuadrillaPorId(id: number) { return prisma.cuadrilla.findUnique({ where: { id }, select: cuadrillaSelect }); }
export function actualizarCuadrilla(id: number, datos: UpdateCuadrillaInput) { return prisma.cuadrilla.update({ where: { id }, data: datos, select: cuadrillaSelect }); }
export function actualizarEstadoCuadrilla(id: number, activa: boolean) { return prisma.cuadrilla.update({ where: { id }, data: { activa }, select: cuadrillaSelect }); }
export function buscarEmpleadoPorId(id: number) { return prisma.empleado.findUnique({ where: { id }, select: empleadoSelect }); }
export function buscarMembresiaVigente(cuadrillaId: number, empleadoId: number) {
    return prisma.miembroCuadrilla.findFirst({ where: { cuadrillaId, empleadoId, fin: null }, select: miembroSelect });
}
export function buscarMembresiaVigentePorId(cuadrillaId: number, id: number) {
    return prisma.miembroCuadrilla.findFirst({ where: { id, cuadrillaId, fin: null }, select: miembroSelect });
}
export function agregarMiembro(cuadrillaId: number, empleadoId: number) {
    return prisma.miembroCuadrilla.create({ data: { cuadrillaId, empleadoId }, select: miembroSelect });
}
export function retirarMiembro(id: number) {
    // Se cierra la vigencia; esLider se conserva como parte del historial de la membresía.
    return prisma.miembroCuadrilla.update({ where: { id }, data: { fin: new Date() }, select: miembroSelect });
}
export function definirLider(cuadrillaId: number, empleadoId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.miembroCuadrilla.updateMany({ where: { cuadrillaId, fin: null }, data: { esLider: false } });
        await tx.miembroCuadrilla.updateMany({ where: { cuadrillaId, empleadoId, fin: null }, data: { esLider: true } });
        return tx.cuadrilla.findUniqueOrThrow({ where: { id: cuadrillaId }, select: cuadrillaSelect });
    });
}

export function listarEmpleadosElegibles() {
    return prisma.empleado.findMany({ where: { active: true }, select: empleadoSelect, orderBy: { codEmpleado: 'asc' } });
}
