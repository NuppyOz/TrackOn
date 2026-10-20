import { prisma } from '../../../infrastructure/prisma.js';
import type { Prisma } from '@prisma/client';
import type { ListarVentas } from './ventas.schema.js';

export type DbVentas = typeof prisma | Prisma.TransactionClient;

const ventaDetalleInclude = {
    cotizacion: { include: { lineas: { orderBy: { posicion: 'asc' as const } } } },
    confirmadaPor: {
        select: {
            id: true,
            identificador: true,
            empleado: {
                select: {
                    persona: {
                        select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true },
                    },
                },
            },
        },
    },
} satisfies Prisma.VentaComercialInclude;

export type VentaDetalle = Prisma.VentaComercialGetPayload<{ include: typeof ventaDetalleInclude }>;

export function buscarPorCotizacion(cotizacionId: number, db: DbVentas = prisma) {
    return db.ventaComercial.findUnique({ where: { cotizacionId }, include: ventaDetalleInclude });
}

export function obtenerVenta(id: number) {
    return prisma.ventaComercial.findUnique({ where: { id }, include: ventaDetalleInclude });
}

export function obtenerCotizacionParaVenta(id: number, db: Prisma.TransactionClient) {
    return db.cotizacionComercial.findUnique({
        where: { id },
        select: { id: true, clienteId: true, estado: true, version: true, moneda: true, total: true },
    });
}

export async function crearEn(tx: Prisma.TransactionClient, datos: { cotizacionId: number; clienteId: number; confirmadaPorId: number; moneda: string; total: string }) {
    const creada = await tx.ventaComercial.create({
        data: { ...datos, confirmadaEn: new Date() },
        select: { id: true },
    });
    return tx.ventaComercial.findUniqueOrThrow({ where: { id: creada.id }, include: ventaDetalleInclude });
}

export async function listar(filtros: ListarVentas) {
    const numero = filtros.q && /^[1-9]\d*$/.test(filtros.q) && Number(filtros.q) <= 2_147_483_647 ? Number(filtros.q) : undefined;
    const where: Prisma.VentaComercialWhereInput = {
        ...(filtros.clienteId !== undefined ? { clienteId: filtros.clienteId } : {}),
        ...(filtros.q ? { OR: [
            ...(numero !== undefined ? [{ id: numero }, { cotizacionId: numero }] : []),
            { cotizacion: { is: { clienteNombreRegistrado: { contains: filtros.q, mode: 'insensitive' } } } },
        ] } : {}),
    };
    const orderBy: Prisma.VentaComercialOrderByWithRelationInput[] = filtros.sortBy === 'id'
        ? [{ id: filtros.sortDir }]
        : [{ confirmadaEn: filtros.sortDir }, { id: filtros.sortDir }];
    const rows = await prisma.ventaComercial.findMany({
        where,
        select: { id: true, cotizacionId: true, clienteId: true, moneda: true, total: true, confirmadaEn: true, cotizacion: { select: { clienteNombreRegistrado: true } } },
        orderBy,
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return rows;
}
