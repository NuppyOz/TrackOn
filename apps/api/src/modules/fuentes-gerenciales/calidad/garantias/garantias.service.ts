import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { nombreCliente, obtenerCliente, verificarReferenciasCliente } from '../casos/shared/relaciones.js';
import type { CrearGarantiaInput, ListarGarantiasInput } from './garantias.schema.js';

const clienteSelect = { cliente: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } }, organizacion: { select: { razonSocial: true, nombreComercial: true } } } } } satisfies Prisma.GarantiaGerencialInclude;
type GarantiaDetalle = Prisma.GarantiaGerencialGetPayload<{ include: typeof clienteSelect }>;
export type GarantiaDto = {
  id: number; referencia: string; clienteId: number; clienteNombre: string; tipo: string; activoReferencia: string;
  equipoId: number | null; ordenId: number | null; inicio: string; fin: string; cobertura: string; exclusiones: string | null;
  registradaEn: string; estado: 'VIGENTE' | 'VENCIDA' | 'FUTURA';
};

function dto(row: GarantiaDetalle, ahora: Date): GarantiaDto {
  const estado = row.inicio > ahora ? 'FUTURA' : row.fin < ahora ? 'VENCIDA' : 'VIGENTE';
  return { id: row.id, referencia: row.referencia, clienteId: row.clienteId, clienteNombre: nombreCliente(row.cliente), tipo: row.tipo,
    activoReferencia: row.activoReferencia, equipoId: row.equipoId, ordenId: row.ordenId, inicio: row.inicio.toISOString(),
    fin: row.fin.toISOString(), cobertura: row.cobertura, exclusiones: row.exclusiones, registradaEn: row.registradaEn.toISOString(), estado };
}

export async function listarGarantias(filtros: ListarGarantiasInput, reloj: () => Date = () => new Date()) {
  const rows = await prisma.garantiaGerencial.findMany({
    where: {
      ...(filtros.clienteId !== undefined ? { clienteId: filtros.clienteId } : {}),
      ...(filtros.activoReferencia ? { activoReferencia: filtros.activoReferencia } : {}),
      ...(filtros.q ? { OR: [{ referencia: { contains: filtros.q, mode: 'insensitive' } }, { activoReferencia: { contains: filtros.q, mode: 'insensitive' } }] } : {}),
    }, include: clienteSelect, orderBy: [{ inicio: 'desc' }, { id: 'desc' }],
    skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1,
  });
  const hayMas = rows.length > filtros.limite;
  const ahora = reloj();
  return { items: rows.slice(0, filtros.limite).map(row => dto(row, ahora)), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtenerGarantia(id: number, reloj: () => Date = () => new Date()) {
  const row = await prisma.garantiaGerencial.findUnique({ where: { id }, include: clienteSelect });
  if (!row) throw new AppError(404, 'La garantía no existe.');
  return dto(row, reloj());
}

export async function crearGarantia(tx: Prisma.TransactionClient, input: CrearGarantiaInput, autorId: number, ahora = new Date()) {
  const inicio = new Date(input.inicio), fin = new Date(input.fin);
  if (inicio >= fin) throw new AppError(400, 'fin debe ser posterior a inicio.');
  if (input.equipoId !== undefined || input.ordenId !== undefined) await verificarReferenciasCliente(tx, { clienteId: input.clienteId, equipoId: input.equipoId, ordenId: input.ordenId });
  else await obtenerCliente(tx, input.clienteId);
  const row = await tx.garantiaGerencial.create({
    data: { referencia: input.referencia, clienteId: input.clienteId, tipo: input.tipo, activoReferencia: input.activoReferencia,
      equipoId: input.equipoId ?? null, ordenId: input.ordenId ?? null, inicio, fin, cobertura: input.cobertura,
      exclusiones: input.exclusiones ?? null, autorId }, include: clienteSelect,
  });
  return dto(row, ahora);
}

export function conflictoGarantia(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'Ya existe una garantía con esa referencia.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, equipo, orden o usuario indicado ya no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza y vuelve a intentar.');
  throw error;
}
