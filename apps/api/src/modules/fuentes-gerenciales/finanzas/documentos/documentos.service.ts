import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { centavos, decimalFijo } from '../../contracts/precision.js';
import type { AnularComprobante, CrearComprobante, ListarComprobantes } from './documentos.schema.js';

const includeBase = {
  cliente: { include: { persona: true, organizacion: true } },
  lineas: { orderBy: { id: 'asc' as const } },
  aplicaciones: { include: { cobro: true }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.ComprobanteGerencialInclude;
type Comprobante = Prisma.ComprobanteGerencialGetPayload<{ include: typeof includeBase }>;
const clienteNombre = (cliente: Comprobante['cliente']) => cliente.organizacion?.nombreComercial ?? cliente.organizacion?.razonSocial ?? (cliente.persona ? [cliente.persona.firstName, cliente.persona.secondName, cliente.persona.firstLastName, cliente.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${cliente.id}`);
const monto = (valor: unknown) => decimalFijo(centavos(String(valor)), 2);
const dtoBase = (row: Comprobante) => {
  const pagado = row.aplicaciones.filter(x => x.cobro.revertidoEn === null).reduce((suma, x) => suma + centavos(String(x.importe)), 0n);
  return {
    id: row.id, clienteId: row.clienteId, clienteNombre: clienteNombre(row.cliente), referencia: row.referencia,
    emisor: row.emisor, emitidaEn: row.emitidaEn.toISOString(), venceEn: row.venceEn.toISOString(),
    importeFinal: monto(row.importeFinal), moneda: 'NIO' as const, anuladaEn: row.anuladaEn?.toISOString() ?? null,
    motivoAnulacion: row.motivoAnulacion, registradoEn: row.registradoEn.toISOString(), observacion: row.observacion,
    version: row.version, saldo: row.anuladaEn ? '0.00' : decimalFijo(centavos(String(row.importeFinal)) - pagado, 2),
  };
};
const dtoDetalle = (row: Comprobante) => ({
  ...dtoBase(row),
  lineas: row.lineas.map(linea => ({ id: linea.id, descripcion: linea.descripcion, importe: monto(linea.importe), ordenId: linea.ordenId, conceptoId: linea.conceptoId })),
  aplicaciones: row.aplicaciones.map(x => ({ id: x.id, cobroId: x.cobroId, importe: monto(x.importe), fechaEfectiva: x.cobro.fechaEfectiva.toISOString(), revertidoEn: x.cobro.revertidoEn?.toISOString() ?? null, referencia: x.cobro.referencia })),
});
const dtoLista = (row: Comprobante) => dtoBase(row);

export async function listar(filtros: ListarComprobantes) {
  const where: Prisma.ComprobanteGerencialWhereInput = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.q ? { referencia: { contains: filtros.q, mode: 'insensitive' } } : {}),
  };
  const rows = await prisma.comprobanteGerencial.findMany({ where, include: includeBase, orderBy: [{ emitidaEn: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 });
  const hayMas = rows.length > filtros.limite;
  return { items: rows.slice(0, filtros.limite).map(dtoLista), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtener(id: number) {
  const row = await prisma.comprobanteGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El comprobante no existe.');
  return dtoDetalle(row);
}

export async function crear(body: CrearComprobante, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const emitidaEn = new Date(body.emitidaEn), venceEn = new Date(body.venceEn);
  if (emitidaEn > ahora || venceEn < emitidaEn) throw new AppError(400, 'Las fechas requieren emisión no futura y vencimiento igual o posterior a la emisión.');
  const total = centavos(body.importeFinal, false);
  const sumaLineas = body.lineas.reduce((suma, linea) => suma + centavos(linea.importe), 0n);
  if (sumaLineas !== total) throw new AppError(400, 'La suma de líneas debe coincidir exactamente con el importe final.');
  const cliente = await tx.cliente.findUnique({ where: { id: body.clienteId }, select: { id: true } });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  for (const linea of body.lineas) {
    if (linea.ordenId) {
      const orden = await tx.ordenTrabajo.findUnique({ where: { id: linea.ordenId }, select: { id: true, ubicacion: { select: { clienteId: true } } } });
      if (!orden) throw new AppError(404, 'Una orden de trabajo indicada no existe.');
      if (orden.ubicacion.clienteId !== body.clienteId) throw new AppError(400, 'La orden de trabajo debe pertenecer al mismo cliente.');
    }
    if (linea.conceptoId && !await tx.conceptoComercial.findUnique({ where: { id: linea.conceptoId }, select: { id: true } })) throw new AppError(404, 'Un concepto indicado no existe.');
  }
  const row = await tx.comprobanteGerencial.create({ data: {
    clienteId: body.clienteId, referencia: body.referencia, emisor: body.emisor, emitidaEn, venceEn,
    importeFinal: decimalFijo(total, 2), autorId, observacion: body.observacion ?? null,
    lineas: { create: body.lineas.map(x => ({ descripcion: x.descripcion, importe: decimalFijo(centavos(x.importe), 2), ordenId: x.ordenId ?? null, conceptoId: x.conceptoId ?? null })) },
  }, include: includeBase });
  return dtoDetalle(row);
}

export async function anular(id: number, body: AnularComprobante, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva);
  const row = await tx.comprobanteGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El comprobante no existe.');
  if (row.version !== body.version) throw new AppError(409, 'El comprobante cambió. Actualiza los datos antes de anularlo.');
  if (row.version >= 2_147_483_647) throw new AppError(409, 'El comprobante alcanzó su versión máxima.');
  if (row.anuladaEn) throw new AppError(409, 'El comprobante ya está anulado.');
  if (fecha < row.emitidaEn || fecha > ahora) throw new AppError(400, 'La fecha de anulación debe ser igual o posterior a la emisión y no futura.');
  if (row.aplicaciones.some(x => x.cobro.revertidoEn === null)) throw new AppError(409, 'No se puede anular un comprobante con cobros vigentes.');
  let ultimaAplicacion = row.aplicaciones.reduce<Date | null>((latest, x) => {
    for (const momento of [x.cobro.fechaEfectiva, x.cobro.revertidoEn]) if (momento && (!latest || momento > latest)) latest = momento;
    return latest;
  }, null);
  const ultimaAplicacionFacturable = await tx.aplicacionFacturableGerencial.aggregate({
    where: { lineaComprobante: { is: { comprobanteId: id } } },
    _max: { fechaEfectiva: true },
  });
  const fechaFacturable = ultimaAplicacionFacturable._max.fechaEfectiva;
  if (fechaFacturable && (!ultimaAplicacion || fechaFacturable > ultimaAplicacion)) ultimaAplicacion = fechaFacturable;
  if (ultimaAplicacion && fecha < ultimaAplicacion) throw new AppError(400, 'La fecha de anulación debe ser igual o posterior a la última aplicación o reversión asociada.');
  const changed = await tx.comprobanteGerencial.updateMany({ where: { id, version: body.version, anuladaEn: null }, data: { anuladaEn: fecha, motivoAnulacion: body.motivo, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El comprobante cambió durante la operación.');
  await tx.auditoria.create({ data: { usuarioId: autorId, tipoActor: 'USUARIO', entidad: 'ComprobanteGerencial', entidadId: String(id), accion: 'ANULAR', datosAnteriores: { anuladaEn: null, version: row.version }, datosNuevos: { anuladaEn: fecha.toISOString(), motivo: body.motivo, version: row.version + 1 } } });
  return dtoDetalle(await tx.comprobanteGerencial.findUniqueOrThrow({ where: { id }, include: includeBase }));
}

export function conflicto(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La referencia y el emisor ya están registrados.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, usuario, orden o concepto indicado no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'El comprobante cambió durante la operación.');
  throw error;
}
