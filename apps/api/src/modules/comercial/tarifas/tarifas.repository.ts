import { prisma } from '../../../infrastructure/prisma.js';
import type { Prisma } from '@prisma/client';
import type { ActualizarConcepto, CambiarEstadoTarifa, CrearConcepto, CrearTarifa, ListarConceptos, ListarTarifas } from './tarifas.schema.js';

export type ClienteDb = Prisma.TransactionClient | typeof prisma;
const proyeccionConcepto = { id: true, codigo: true, nombre: true, unidad: true, tipo: true } as const;

export function listarConceptos(filtros: ListarConceptos) {
    const where = {
        ...(filtros.estado === 'activos' ? { activo: true } : filtros.estado === 'inactivos' ? { activo: false } : {}),
        ...(filtros.q ? { OR: [
            { codigo: { contains: filtros.q, mode: 'insensitive' as const } },
            { nombre: { contains: filtros.q, mode: 'insensitive' as const } },
        ] } : {}),
    };
    const dir = filtros.sortDir;
    const orderBy: Prisma.ConceptoComercialOrderByWithRelationInput[] = filtros.sortBy === 'codigo'
        ? [{ codigo: dir }, { id: dir }]
        : filtros.sortBy === 'creadoEn' ? [{ creadoEn: dir }, { id: dir }] : [{ nombre: dir }, { id: dir }];
    return prisma.conceptoComercial.findMany({
        where,
        orderBy,
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
}

export function crearConcepto(datos: CrearConcepto) {
    return prisma.conceptoComercial.create({ data: datos });
}

export async function actualizarConcepto(id: number, datos: ActualizarConcepto) {
    const { version, ...fields } = datos;
    return prisma.$transaction(async tx => {
        const cambio = await tx.conceptoComercial.updateMany({
            where: { id, version },
            data: { ...fields, version: { increment: 1 } },
        });
        if (cambio.count === 1) return { tipo: 'actualizado' as const, concepto: await tx.conceptoComercial.findUnique({ where: { id } }) };
        return await tx.conceptoComercial.findUnique({ where: { id }, select: { id: true } })
            ? { tipo: 'conflicto' as const }
            : { tipo: 'no-encontrado' as const };
    });
}

export function listarTarifas(filtros: ListarTarifas) {
    const where = {
        ...(filtros.conceptoId !== undefined ? { conceptoId: filtros.conceptoId } : {}),
        ...(filtros.clienteId !== undefined ? { clienteId: filtros.clienteId } : {}),
        ...(filtros.estado === 'activos' ? { activo: true } : filtros.estado === 'inactivos' ? { activo: false } : {}),
        ...(filtros.q ? { concepto: { OR: [
            { codigo: { contains: filtros.q, mode: 'insensitive' as const } },
            { nombre: { contains: filtros.q, mode: 'insensitive' as const } },
        ] } } : {}),
    };
    return prisma.tarifaComercial.findMany({
        where,
        select: { id: true, conceptoId: true, clienteId: true, moneda: true, precio: true, activo: true, version: true, creadaEn: true, concepto: { select: proyeccionConcepto } },
        orderBy: filtros.sortBy === 'id' ? [{ id: filtros.sortDir }] : [{ creadaEn: filtros.sortDir }, { id: 'desc' }],
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
}

export function obtenerCliente(id: number, db: ClienteDb = prisma) {
    return db.cliente.findUnique({ where: { id }, select: { id: true, activo: true } });
}

export function obtenerConceptoResolver(id: number, db: ClienteDb = prisma) {
    return db.conceptoComercial.findUnique({ where: { id }, select: { ...proyeccionConcepto, activo: true } });
}

export function buscarTarifaCliente(conceptoId: number, clienteId: number, db: ClienteDb = prisma) {
    return db.tarifaComercial.findFirst({
        where: { conceptoId, clienteId, activo: true, moneda: 'NIO' },
        orderBy: { id: 'desc' },
        select: { id: true, conceptoId: true, clienteId: true, moneda: true, precio: true },
    });
}

export function buscarTarifaEstándar(conceptoId: number, db: ClienteDb = prisma) {
    return db.tarifaComercial.findFirst({
        where: { conceptoId, clienteId: null, activo: true, moneda: 'NIO' },
        orderBy: { id: 'desc' },
        select: { id: true, conceptoId: true, clienteId: true, moneda: true, precio: true },
    });
}

export function crearTarifa(datos: Omit<CrearTarifa, 'precio'> & { precio: string }) {
    return prisma.tarifaComercial.create({ data: { ...datos, clienteId: datos.clienteId ?? null, moneda: 'NIO', activo: true, version: 1 } });
}

export async function cambiarEstadoTarifa(id: number, datos: CambiarEstadoTarifa) {
    return prisma.$transaction(async tx => {
        const cambio = await tx.tarifaComercial.updateMany({
            where: { id, version: datos.version },
            data: { activo: datos.activo, version: { increment: 1 } },
        });
        if (cambio.count === 1) return { tipo: 'actualizado' as const, tarifa: await tx.tarifaComercial.findUnique({ where: { id } }) };
        return await tx.tarifaComercial.findUnique({ where: { id }, select: { id: true } })
            ? { tipo: 'conflicto' as const }
            : { tipo: 'no-encontrado' as const };
    });
}
