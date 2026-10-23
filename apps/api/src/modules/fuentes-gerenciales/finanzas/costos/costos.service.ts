import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { centavos, decimalFijo } from '../../contracts/precision.js';
import type { CrearCosto, ListarCostos, RevertirCosto } from './costos.schema.js';

const includeBase = {
  cliente: { include: { persona: true, organizacion: true } },
  orden: { select: { id: true } },
  comprobante: { select: { id: true, referencia: true } },
} satisfies Prisma.CostoGerencialInclude;
type Costo = Prisma.CostoGerencialGetPayload<{ include: typeof includeBase }>;
const clienteNombre = (c: NonNullable<Costo['cliente']>) => c.organizacion?.nombreComercial ?? c.organizacion?.razonSocial ?? (c.persona ? [c.persona.firstName, c.persona.secondName, c.persona.firstLastName, c.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${c.id}`);
const dto = (r: Costo) => ({ id: r.id, referencia: r.referencia, fechaEfectiva: r.fechaEfectiva.toISOString(), categoria: r.categoria, importe: decimalFijo(centavos(String(r.importe)), 2), clienteId: r.clienteId, clienteNombre: r.cliente ? clienteNombre(r.cliente) : null, ordenId: r.ordenId, comprobanteId: r.comprobanteId, comprobanteReferencia: r.comprobante?.referencia ?? null, revertidoEn: r.revertidoEn?.toISOString() ?? null, motivoReversion: r.motivoReversion, registradoEn: r.registradoEn.toISOString(), observacion: r.observacion, version: r.version });

export async function listar(f: ListarCostos) {
  const where: Prisma.CostoGerencialWhereInput = { ...(f.clienteId ? { clienteId: f.clienteId } : {}), ...(f.q ? { OR: [{ referencia: { contains: f.q, mode: 'insensitive' } }, { comprobante: { is: { referencia: { contains: f.q, mode: 'insensitive' } } } }] } : {}) };
  const rows = await prisma.costoGerencial.findMany({ where, include: includeBase, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], skip: (f.pagina - 1) * f.limite, take: f.limite + 1 });
  return { items: rows.slice(0, f.limite).map(dto), pagina: f.pagina, limite: f.limite, hayMas: rows.length > f.limite };
}
export async function obtener(id: number) {
  const row = await prisma.costoGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El costo no existe.');
  return dto(row);
}
export async function crear(body: CrearCosto, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva), importe = centavos(body.importe, false);
  if (fecha > ahora) throw new AppError(400, 'La fecha efectiva no puede ser futura.');
  let clienteId = body.clienteId;
  if (body.ordenId !== undefined) {
    const orden = await tx.ordenTrabajo.findUnique({ where: { id: body.ordenId }, select: { id: true, ubicacion: { select: { clienteId: true } } } });
    if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
    const idClienteOT = orden.ubicacion.clienteId;
    if (clienteId !== undefined && clienteId !== idClienteOT) throw new AppError(400, 'La orden de trabajo debe pertenecer al cliente indicado.');
    clienteId ??= idClienteOT;
  }
  if (body.comprobanteId !== undefined) {
    const comp = await tx.comprobanteGerencial.findUnique({ where: { id: body.comprobanteId }, select: { id: true, clienteId: true } });
    if (!comp) throw new AppError(404, 'El comprobante indicado no existe.');
    if (clienteId !== undefined && clienteId !== comp.clienteId) throw new AppError(400, 'El comprobante debe pertenecer al cliente indicado.');
    clienteId ??= comp.clienteId;
  }
  if (clienteId !== undefined && !await tx.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })) throw new AppError(404, 'El cliente no existe.');
  const row = await tx.costoGerencial.create({ data: { referencia: body.referencia, fechaEfectiva: fecha, categoria: body.categoria, importe: decimalFijo(importe, 2), clienteId: clienteId ?? null, ordenId: body.ordenId ?? null, comprobanteId: body.comprobanteId ?? null, autorId, observacion: body.observacion ?? null }, include: includeBase });
  return dto(row);
}
export async function revertir(id: number, body: RevertirCosto, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva), row = await tx.costoGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El costo no existe.');
  if (row.version !== body.version) throw new AppError(409, 'El costo cambió. Actualiza los datos antes de revertirlo.');
  if (row.version >= 2_147_483_647) throw new AppError(409, 'El costo alcanzó su versión máxima.');
  if (row.revertidoEn) throw new AppError(409, 'El costo ya está revertido.');
  if (fecha < row.fechaEfectiva || fecha > ahora) throw new AppError(400, 'La fecha de reversión debe ser igual o posterior al costo y no futura.');
  const changed = await tx.costoGerencial.updateMany({ where: { id, version: body.version, revertidoEn: null }, data: { revertidoEn: fecha, motivoReversion: body.motivo, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El costo cambió durante la operación.');
  await tx.auditoria.create({ data: { usuarioId: autorId, tipoActor: 'USUARIO', entidad: 'CostoGerencial', entidadId: String(id), accion: 'REVERTIR', datosAnteriores: { revertidoEn: null, version: row.version }, datosNuevos: { revertidoEn: fecha.toISOString(), motivo: body.motivo, version: row.version + 1 } } });
  return dto(await tx.costoGerencial.findUniqueOrThrow({ where: { id }, include: includeBase }));
}
export function conflicto(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La referencia del costo ya está registrada.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, usuario, orden o comprobante indicado no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'El costo cambió durante la operación.');
  throw error;
}
