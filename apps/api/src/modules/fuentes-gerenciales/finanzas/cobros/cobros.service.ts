import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { centavos, decimalFijo } from '../../contracts/precision.js';
import type { CrearCobro, ListarCobros, RevertirCobro } from './cobros.schema.js';

const includeBase = {
  cliente: { include: { persona: true, organizacion: true } },
  aplicaciones: { include: { comprobante: { select: { id: true, referencia: true } } }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.CobroGerencialInclude;
type Cobro = Prisma.CobroGerencialGetPayload<{ include: typeof includeBase }>;
const clienteNombre = (c: Cobro['cliente']) => c.organizacion?.nombreComercial ?? c.organizacion?.razonSocial ?? (c.persona ? [c.persona.firstName, c.persona.secondName, c.persona.firstLastName, c.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${c.id}`);
const dtoBase = (r: Cobro) => ({ id: r.id, clienteId: r.clienteId, clienteNombre: clienteNombre(r.cliente), referencia: r.referencia, fechaEfectiva: r.fechaEfectiva.toISOString(), importe: decimalFijo(centavos(String(r.importe)), 2), revertidoEn: r.revertidoEn?.toISOString() ?? null, motivoReversion: r.motivoReversion, registradoEn: r.registradoEn.toISOString(), observacion: r.observacion, version: r.version });
const dtoDetalle = (r: Cobro) => ({ ...dtoBase(r), aplicaciones: r.aplicaciones.map(a => ({ id: a.id, comprobanteId: a.comprobanteId, comprobanteReferencia: a.comprobante.referencia, importe: decimalFijo(centavos(String(a.importe)), 2) })) });

export async function listar(f: ListarCobros) {
  const where: Prisma.CobroGerencialWhereInput = { ...(f.clienteId ? { clienteId: f.clienteId } : {}), ...(f.q ? { referencia: { contains: f.q, mode: 'insensitive' } } : {}) };
  const rows = await prisma.cobroGerencial.findMany({ where, include: includeBase, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], skip: (f.pagina - 1) * f.limite, take: f.limite + 1 });
  return { items: rows.slice(0, f.limite).map(dtoBase), pagina: f.pagina, limite: f.limite, hayMas: rows.length > f.limite };
}
export async function obtener(id: number) {
  const row = await prisma.cobroGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El cobro no existe.');
  return dtoDetalle(row);
}
export async function crear(body: CrearCobro, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva);
  if (fecha > ahora) throw new AppError(400, 'La fecha efectiva no puede ser futura.');
  if (new Set(body.aplicaciones.map(x => x.comprobanteId)).size !== body.aplicaciones.length) throw new AppError(400, 'Cada comprobante debe aparecer una sola vez.');
  const total = body.aplicaciones.reduce((acc, x) => acc + centavos(x.importe, false), 0n);
  if (total > 9_999_999_999_999_999n) throw new AppError(400, 'El importe total del cobro excede el máximo de 16,2 dígitos.');
  const ids = body.aplicaciones.map(x => x.comprobanteId);
  const docs = await tx.comprobanteGerencial.findMany({ where: { id: { in: ids } }, include: { aplicaciones: { include: { cobro: { select: { fechaEfectiva: true, revertidoEn: true } } } } } });
  if (docs.length !== ids.length) throw new AppError(404, 'Uno o más comprobantes no existen.');
  const porId = new Map(docs.map(x => [x.id, x]));
  for (const aplicacion of body.aplicaciones) {
    const doc = porId.get(aplicacion.comprobanteId)!;
    if (doc.clienteId !== body.clienteId) throw new AppError(400, 'Todos los comprobantes deben pertenecer al mismo cliente del cobro.');
    if (doc.anuladaEn) throw new AppError(409, 'No se puede aplicar un cobro a un comprobante anulado.');
    if (fecha < doc.emitidaEn) throw new AppError(400, 'La fecha del cobro no puede ser anterior a la emisión del comprobante.');
    let ultima = doc.emitidaEn;
    for (const existente of doc.aplicaciones) for (const momento of [existente.cobro.fechaEfectiva, existente.cobro.revertidoEn]) if (momento && momento > ultima) ultima = momento;
    if (fecha < ultima) throw new AppError(400, 'La fecha del cobro no puede ser anterior a cobros o reversiones registrados en el comprobante.');
    const cobrado = doc.aplicaciones.filter(x => x.cobro.revertidoEn === null).reduce((acc, x) => acc + centavos(String(x.importe)), 0n);
    if (centavos(aplicacion.importe, false) > centavos(String(doc.importeFinal)) - cobrado) throw new AppError(409, 'El cobro supera el saldo disponible del comprobante.');
  }
  const cliente = await tx.cliente.findUnique({ where: { id: body.clienteId }, select: { id: true } });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  const row = await tx.cobroGerencial.create({ data: { clienteId: body.clienteId, referencia: body.referencia, fechaEfectiva: fecha, importe: decimalFijo(total, 2), autorId, observacion: body.observacion ?? null, aplicaciones: { create: body.aplicaciones.map(a => ({ comprobanteId: a.comprobanteId, importe: decimalFijo(centavos(a.importe, false), 2) })) } }, include: includeBase });
  return dtoDetalle(row);
}
export async function revertir(id: number, body: RevertirCobro, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva), row = await tx.cobroGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El cobro no existe.');
  if (row.version !== body.version) throw new AppError(409, 'El cobro cambió. Actualiza los datos antes de revertirlo.');
  if (row.version >= 2_147_483_647) throw new AppError(409, 'El cobro alcanzó su versión máxima.');
  if (row.revertidoEn) throw new AppError(409, 'El cobro ya está revertido.');
  if (fecha < row.fechaEfectiva || fecha > ahora) throw new AppError(400, 'La fecha de reversión debe ser igual o posterior al cobro y no futura.');
  for (const a of row.aplicaciones) {
    const doc = await tx.comprobanteGerencial.findUnique({ where: { id: a.comprobanteId }, select: { anuladaEn: true } });
    if (doc?.anuladaEn && doc.anuladaEn < fecha) throw new AppError(409, 'La reversión no puede ser posterior a la anulación del comprobante.');
  }
  const changed = await tx.cobroGerencial.updateMany({ where: { id, version: body.version, revertidoEn: null }, data: { revertidoEn: fecha, motivoReversion: body.motivo, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El cobro cambió durante la operación.');
  await tx.auditoria.create({ data: { usuarioId: autorId, tipoActor: 'USUARIO', entidad: 'CobroGerencial', entidadId: String(id), accion: 'REVERTIR', datosAnteriores: { revertidoEn: null, version: row.version }, datosNuevos: { revertidoEn: fecha.toISOString(), motivo: body.motivo, version: row.version + 1 } } });
  return dtoDetalle(await tx.cobroGerencial.findUniqueOrThrow({ where: { id }, include: includeBase }));
}
export function conflicto(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La referencia del cobro ya está registrada para este cliente.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, usuario o comprobante indicado no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'El cobro o el saldo del comprobante cambió durante la operación.');
  throw error;
}
