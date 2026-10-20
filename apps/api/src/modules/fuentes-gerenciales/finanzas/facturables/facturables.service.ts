import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { decimalFijo, milesimas } from '../../contracts/precision.js';
import type { AplicarFacturable, CrearFacturable, ListarFacturables } from './facturables.schema.js';

const includeBase = {
  cliente: { include: { persona: true, organizacion: true } },
  concepto: true,
  aplicaciones: { include: { lineaComprobante: { include: { comprobante: true } } }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.FacturableGerencialInclude;
type Facturable = Prisma.FacturableGerencialGetPayload<{ include: typeof includeBase }>;
const clienteNombre = (cliente: Facturable['cliente']) => cliente.organizacion?.nombreComercial ?? cliente.organizacion?.razonSocial ?? (cliente.persona ? [cliente.persona.firstName, cliente.persona.secondName, cliente.persona.firstLastName, cliente.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${cliente.id}`);
const aplicacionesVigentes = (row: Facturable) => row.aplicaciones.filter(x => x.lineaComprobante.comprobante.anuladaEn === null);
const pendiente = (row: Facturable) => milesimas(String(row.cantidad)) - aplicacionesVigentes(row).reduce((suma, x) => suma + milesimas(String(x.cantidad)), 0n);
const dtoBase = (row: Facturable) => ({
  id: row.id, clienteId: row.clienteId, clienteNombre: clienteNombre(row.cliente), conceptoId: row.conceptoId,
  conceptoNombre: row.concepto.nombre, unidad: row.unidad, cantidad: decimalFijo(milesimas(String(row.cantidad)), 3),
  pendiente: decimalFijo(pendiente(row), 3), fechaEfectiva: row.fechaEfectiva.toISOString(), referencia: row.referencia,
  ordenId: row.ordenId, ventaId: row.ventaId, lineaCotizacionId: row.lineaCotizacionId,
  observacion: row.observacion, registradoEn: row.registradoEn.toISOString(), version: row.version,
});
const dtoDetalle = (row: Facturable) => ({
  ...dtoBase(row),
  aplicaciones: row.aplicaciones.map(x => ({
    id: x.id, lineaComprobanteId: x.lineaComprobanteId, comprobanteId: x.lineaComprobante.comprobanteId,
    comprobanteReferencia: x.lineaComprobante.comprobante.referencia, cantidad: decimalFijo(milesimas(String(x.cantidad)), 3),
    fechaEfectiva: x.fechaEfectiva.toISOString(), comprobanteAnuladaEn: x.lineaComprobante.comprobante.anuladaEn?.toISOString() ?? null,
  })),
});

export async function listar(filtros: ListarFacturables) {
  const where: Prisma.FacturableGerencialWhereInput = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.q ? { referencia: { contains: filtros.q, mode: 'insensitive' } } : {}),
  };
  const rows = await prisma.facturableGerencial.findMany({ where, include: includeBase, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 });
  const hayMas = rows.length > filtros.limite;
  return { items: rows.slice(0, filtros.limite).map(dtoBase), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtener(id: number) {
  const row = await prisma.facturableGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El servicio facturable no existe.');
  return dtoDetalle(row);
}

export async function crear(body: CrearFacturable, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fechaEfectiva = new Date(body.fechaEfectiva);
  const cantidad = milesimas(body.cantidad, false);
  if (fechaEfectiva > ahora) throw new AppError(400, 'La fecha efectiva no puede ser futura.');
  const cliente = await tx.cliente.findUnique({ where: { id: body.clienteId }, select: { id: true } });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  const concepto = await tx.conceptoComercial.findUnique({ where: { id: body.conceptoId }, select: { id: true, tipo: true, unidad: true, activo: true } });
  if (!concepto) throw new AppError(404, 'El concepto no existe.');
  if (!concepto.activo || !['SERVICIO', 'MANO_OBRA'].includes(concepto.tipo)) throw new AppError(400, 'El concepto debe estar activo y ser de servicio o mano de obra.');
  if (body.ordenId) {
    const orden = await tx.ordenTrabajo.findUnique({ where: { id: body.ordenId }, select: { id: true, ubicacion: { select: { clienteId: true } } } });
    if (!orden) throw new AppError(404, 'La orden de trabajo no existe.');
    if (orden.ubicacion.clienteId !== body.clienteId) throw new AppError(400, 'La orden de trabajo debe pertenecer al mismo cliente.');
  }
  if (body.ventaId !== undefined && body.lineaCotizacionId !== undefined) {
    const [venta, linea, existente] = await Promise.all([
      tx.ventaComercial.findUnique({ where: { id: body.ventaId }, select: { id: true, clienteId: true, cotizacionId: true } }),
      tx.lineaCotizacionComercial.findUnique({ where: { id: body.lineaCotizacionId }, select: { id: true, cotizacionId: true, conceptoId: true, tipo: true, cantidad: true } }),
      tx.facturableGerencial.findUnique({ where: { lineaCotizacionId: body.lineaCotizacionId }, select: { id: true } }),
    ]);
    if (!venta || !linea) throw new AppError(404, 'La venta o línea de cotización no existe.');
    if (existente) throw new AppError(409, 'La línea de venta ya tiene un servicio facturable registrado.');
    if (venta.clienteId !== body.clienteId || venta.cotizacionId !== linea.cotizacionId) throw new AppError(400, 'La venta, línea de cotización y cliente deben coincidir.');
    if (linea.conceptoId !== body.conceptoId || linea.tipo !== concepto.tipo) throw new AppError(400, 'La línea vendida debe coincidir con el concepto de servicio.');
    if (cantidad > milesimas(String(linea.cantidad))) throw new AppError(400, 'La cantidad no puede superar la cantidad vendida.');
  }
  const row = await tx.facturableGerencial.create({ data: {
    clienteId: body.clienteId, conceptoId: body.conceptoId, referencia: body.referencia, fechaEfectiva,
    cantidad: decimalFijo(cantidad, 3), unidad: concepto.unidad, ordenId: body.ordenId ?? null,
    ventaId: body.ventaId ?? null, lineaCotizacionId: body.lineaCotizacionId ?? null,
    autorId, observacion: body.observacion ?? null,
  }, include: includeBase });
  return dtoDetalle(row);
}

export async function aplicar(id: number, body: AplicarFacturable, autorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.fechaEfectiva), cantidad = milesimas(body.cantidad, false);
  if (fecha > ahora) throw new AppError(400, 'La fecha efectiva no puede ser futura.');
  const row = await tx.facturableGerencial.findUnique({ where: { id }, include: includeBase });
  if (!row) throw new AppError(404, 'El servicio facturable no existe.');
  if (fecha < row.fechaEfectiva) throw new AppError(400, 'La aplicación no puede ser anterior al servicio realizado.');
  const linea = await tx.lineaComprobanteGerencial.findUnique({ where: { id: body.lineaComprobanteId }, include: { comprobante: { select: { id: true, clienteId: true, emitidaEn: true, anuladaEn: true, referencia: true } }, concepto: { select: { id: true, unidad: true } } } });
  if (!linea) throw new AppError(404, 'La línea de comprobante no existe.');
  if (linea.comprobante.anuladaEn) throw new AppError(409, 'El comprobante está anulado.');
  if (linea.comprobante.clienteId !== row.clienteId || linea.conceptoId !== row.conceptoId || linea.concepto?.unidad !== row.unidad) throw new AppError(400, 'El comprobante debe corresponder al mismo cliente, concepto y unidad.');
  if (fecha < linea.comprobante.emitidaEn) throw new AppError(400, 'La aplicación no puede ser anterior a la emisión del comprobante.');
  const restante = pendiente(row);
  if (cantidad > restante) throw new AppError(409, 'La cantidad supera el servicio pendiente de facturar.');
  if (row.version >= 2_147_483_647) throw new AppError(409, 'El servicio facturable alcanzó su versión máxima.');
  const changed = await tx.facturableGerencial.updateMany({ where: { id, version: row.version }, data: { version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El servicio facturable cambió durante la operación.');
  await tx.aplicacionFacturableGerencial.create({ data: { facturableId: id, lineaComprobanteId: linea.id, cantidad: decimalFijo(cantidad, 3), fechaEfectiva: fecha, autorId } });
  return dtoDetalle(await tx.facturableGerencial.findUniqueOrThrow({ where: { id }, include: includeBase }));
}

export function conflicto(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La referencia o línea de venta ya están registradas.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, concepto, orden, venta o línea indicada no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'El servicio facturable cambió durante la operación.');
  throw error;
}
