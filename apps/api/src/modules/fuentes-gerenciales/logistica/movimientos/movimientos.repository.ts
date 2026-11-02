import { Prisma } from '@prisma/client';
import { prisma } from '../../../../infrastructure/prisma.js';
import type { ListarMovimientos } from './movimientos.schema.js';

export type DbMovimientos = typeof prisma | Prisma.TransactionClient;
export const incluyeDetalle = {
  articulo: { select: { id: true, codigo: true, nombre: true, unidad: true, movimientos: { orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], take: 1, select: { id: true } } } },
  derivados: { select: { id: true } }, recepcion: { select: { id: true } },
} satisfies Prisma.MovimientoGerencialInclude;

export function buscarArticulo(tx: Prisma.TransactionClient, id: number) {
  return tx.articuloGerencial.findUnique({ where: { id } });
}
export function ordenExiste(tx: Prisma.TransactionClient, id: number) {
  return tx.ordenTrabajo.findUnique({ where: { id }, select: { id: true } });
}
export function obtener(id: number, db: DbMovimientos = prisma) {
  return db.movimientoGerencial.findUnique({ where: { id }, include: incluyeDetalle });
}
export function listar(filtros: ListarMovimientos) {
  const q = filtros.q?.trim();
  return prisma.movimientoGerencial.findMany({
    where: {
      ...(filtros.articuloId ? { articuloId: filtros.articuloId } : {}),
      ...(q ? { OR: [{ referencia: { contains: q, mode: 'insensitive' } }, { articulo: { codigo: { contains: q, mode: 'insensitive' } } }, { articulo: { nombre: { contains: q, mode: 'insensitive' } } }] } : {}),
      ...(filtros.desde || filtros.hasta ? { fechaEfectiva: { ...(filtros.desde ? { gte: new Date(filtros.desde) } : {}), ...(filtros.hasta ? { lte: new Date(filtros.hasta) } : {}) } } : {}),
    },
    orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1, include: incluyeDetalle,
  });
}
export function crear(tx: Prisma.TransactionClient, data: Prisma.MovimientoGerencialUncheckedCreateInput) {
  return tx.movimientoGerencial.create({ data, include: incluyeDetalle });
}
export function ultimo(tx: Prisma.TransactionClient, articuloId: number) {
  return tx.movimientoGerencial.findFirst({ where: { articuloId }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }] });
}
export function porOrigen(tx: Prisma.TransactionClient, origenId: number) {
  return tx.movimientoGerencial.findMany({ where: { origenId, tipo: 'DEVOLUCION' }, select: { id: true, cantidad: true, valor: true, derivados: { where: { tipo: 'REVERSO' }, select: { id: true } } } });
}
export function tieneReverso(tx: Prisma.TransactionClient, id: number) {
  return tx.movimientoGerencial.findFirst({ where: { origenId: id, tipo: 'REVERSO' }, select: { id: true } });
}
