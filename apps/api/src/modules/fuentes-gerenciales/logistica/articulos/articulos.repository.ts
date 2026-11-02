import { Prisma } from '@prisma/client';
import { prisma } from '../../../../infrastructure/prisma.js';
import type { ListarArticulos } from './articulos.schema.js';

export type DbArticulos = typeof prisma | Prisma.TransactionClient;

export function obtener(id: number, db: DbArticulos = prisma) {
  return db.articuloGerencial.findUnique({ where: { id } });
}
export function buscarMaterial(id: number, db: DbArticulos) {
  return db.material.findUnique({ where: { id }, select: { id: true, codigo: true, nombre: true, unidadMedida: true, activo: true, articuloGerencial: { select: { id: true } } } });
}
export function listar(filtros: ListarArticulos) {
  const q = filtros.q?.trim();
  return prisma.articuloGerencial.findMany({
    where: q ? { OR: [{ codigo: { contains: q, mode: 'insensitive' } }, { nombre: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1,
  });
}
export function crear(tx: Prisma.TransactionClient, data: Prisma.ArticuloGerencialUncheckedCreateInput) {
  return tx.articuloGerencial.create({ data });
}
export function actualizarSaldo(tx: Prisma.TransactionClient, id: number, version: number, saldoCantidad: string, saldoValor: string, ultimaFecha: Date) {
  return tx.articuloGerencial.updateMany({ where: { id, version }, data: { saldoCantidad, saldoValor, ultimaFecha, version: { increment: 1 } } });
}
