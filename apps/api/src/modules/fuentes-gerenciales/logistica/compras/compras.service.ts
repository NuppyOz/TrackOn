import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { milesimas, costoMicro, decimalFijo } from '../../contracts/precision.js';
import { registrarMovimiento } from '../movimientos/movimientos.service.js';
import type { CancelarPendiente, CrearCompra, ListarCompras, RecibirLinea } from './compras.schema.js';

const includeDetalle = {
  lineas: {
    orderBy: { id: 'asc' as const },
    include: {
      articulo: { select: { id: true, codigo: true, nombre: true, unidad: true } },
      recepciones: { orderBy: [{ fechaEfectiva: 'asc' as const }, { id: 'asc' as const }], select: { id: true, lineaId: true, cantidad: true, fechaEfectiva: true, referencia: true, movimientoId: true, observacion: true } },
    },
  },
} satisfies Prisma.CompraGerencialInclude;
type CompraDetalle = Prisma.CompraGerencialGetPayload<{ include: typeof includeDetalle }>;
type LineaRecepcion = Prisma.LineaCompraGerencialGetPayload<{ include: { compra: { select: { id: true, fechaEfectiva: true } }, articulo: { select: { id: true } }, recepciones: { select: { cantidad: true, fechaEfectiva: true } } } }>;

function cabecera(row: Pick<CompraDetalle, 'id'|'proveedor'|'referencia'|'fechaEfectiva'|'registradoEn'|'observacion'>) {
  return { id: row.id, proveedor: row.proveedor, referencia: row.referencia, fechaEfectiva: row.fechaEfectiva.toISOString(), registradoEn: row.registradoEn.toISOString(), observacion: row.observacion };
}
function detalleDto(row: CompraDetalle) {
  const recepciones = row.lineas.flatMap(linea => linea.recepciones.map(recepcion => ({
    id: recepcion.id, lineaId: recepcion.lineaId, articuloId: linea.articulo.id, articuloCodigo: linea.articulo.codigo,
    unidad: linea.articulo.unidad, cantidad: recepcion.cantidad.toFixed(3), fechaEfectiva: recepcion.fechaEfectiva.toISOString(),
    referencia: recepcion.referencia, movimientoId: recepcion.movimientoId, observacion: recepcion.observacion,
  }))).sort((a, b) => a.fechaEfectiva.localeCompare(b.fechaEfectiva) || a.id - b.id);
  const lineas = row.lineas.map(linea => {
    const recibido = linea.recepciones.reduce((sum, item) => sum + milesimas(item.cantidad.toFixed(3), true), 0n);
    const cancelado = milesimas(linea.cantidadCancelada.toFixed(3), true);
    const cantidad = milesimas(linea.cantidad.toFixed(3), true);
    const pendiente = cantidad - recibido - cancelado;
    if (pendiente < 0n) throw new AppError(409, 'La línea de compra supera la cantidad comprometida.');
    return {
      id: linea.id, articuloId: linea.articulo.id, articuloCodigo: linea.articulo.codigo, articuloNombre: linea.articulo.nombre, unidad: linea.articulo.unidad,
      cantidad: decimalFijo(cantidad, 3), costoUnitario: linea.costoUnitario.toFixed(6), prometidaEn: linea.prometidaEn.toISOString(),
      recibido: decimalFijo(recibido, 3), cancelado: decimalFijo(cancelado, 3), pendiente: decimalFijo(pendiente, 3),
      canceladaEn: linea.canceladaEn?.toISOString() ?? null, motivoCancelacion: linea.motivoCancelacion, version: linea.version,
    };
  });
  return { ...cabecera(row), lineas, recepciones };
}
async function detalle(id: number, tx: Prisma.TransactionClient) {
  const row = await tx.compraGerencial.findUnique({ where: { id }, include: includeDetalle });
  if (!row) throw new AppError(404, 'La compra no existe.');
  return detalleDto(row);
}
async function lineaParaCambio(id: number, tx: Prisma.TransactionClient): Promise<LineaRecepcion> {
  const row = await tx.lineaCompraGerencial.findUnique({ where: { id }, include: {
    compra: { select: { id: true, fechaEfectiva: true } }, articulo: { select: { id: true } },
    recepciones: { orderBy: [{ fechaEfectiva: 'asc' }, { id: 'asc' }], select: { cantidad: true, fechaEfectiva: true } },
  } });
  if (!row) throw new AppError(404, 'La línea de compra no existe.');
  return row;
}
function pendienteLinea(linea: LineaRecepcion) {
  const ordenada = milesimas(linea.cantidad.toFixed(3), true);
  const recibido = linea.recepciones.reduce((sum, receipt) => sum + milesimas(receipt.cantidad.toFixed(3), true), 0n);
  const cancelado = milesimas(linea.cantidadCancelada.toFixed(3), true);
  const pendiente = ordenada - recibido - cancelado;
  if (pendiente < 0n) throw new AppError(409, 'La línea de compra supera la cantidad comprometida.');
  return { recibido, cancelado, pendiente };
}

export async function listar(filtros: ListarCompras) {
  const q = filtros.q?.trim();
  const compras = await prisma.compraGerencial.findMany({
    where: q ? { OR: [{ referencia: { contains: q, mode: 'insensitive' } }, { proveedor: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1,
  });
  return { items: compras.slice(0, filtros.limite).map(cabecera), pagina: filtros.pagina, limite: filtros.limite, hayMas: compras.length > filtros.limite };
}
export async function obtener(id: number) {
  const row = await prisma.compraGerencial.findUnique({ where: { id }, include: includeDetalle });
  if (!row) throw new AppError(404, 'La compra no existe.');
  return detalleDto(row);
}

export async function crear(datos: CrearCompra, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  try {
    return await ejecutarIdempotente({ tipo: 'USUARIO', id: autorId }, 'fuentes.logistica.compras.crear', clave, datos, async tx => {
      const fecha = new Date(datos.fechaEfectiva);
      if (fecha.getTime() > Date.now()) throw new AppError(400, 'La fecha de la compra no puede estar en el futuro.');
      for (const linea of datos.lineas) {
        milesimas(linea.cantidad, false);
        costoMicro(linea.costoUnitario);
      }
      const articulos = await tx.articuloGerencial.findMany({ where: { id: { in: datos.lineas.map(linea => linea.articuloId) } }, select: { id: true } });
      if (articulos.length !== datos.lineas.length) throw new AppError(404, 'Uno o más artículos de la compra no existen.');
      const created = await tx.compraGerencial.create({ data: {
        proveedor: datos.proveedor, referencia: datos.referencia, fechaEfectiva: fecha, observacion: datos.observacion ?? null, autorId,
        lineas: { create: datos.lineas.map(linea => ({
          cantidad: linea.cantidad, costoUnitario: linea.costoUnitario, prometidaEn: new Date(linea.prometidaEn),
          articulo: { connect: { id: linea.articuloId } },
        })) },
      }, select: { id: true } });
      return detalle(created.id, tx);
    });
  } catch (error) { conflictoCompra(error); }
}

export async function recibirLinea(id: number, datos: RecibirLinea, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  try {
    return await ejecutarIdempotente({ tipo: 'USUARIO', id: autorId }, 'fuentes.logistica.compras.recibir', clave, { id, ...datos }, async tx => {
      const linea = await lineaParaCambio(id, tx);
      if (linea.version !== datos.version) throw new AppError(409, 'La línea cambió. Actualiza los datos antes de recibirla.');
      if (linea.version >= 2_147_483_647) throw new AppError(409, 'La línea alcanzó su límite de actualizaciones.');
      const fecha = new Date(datos.fechaEfectiva);
      if (fecha.getTime() > Date.now()) throw new AppError(400, 'La fecha de recepción no puede estar en el futuro.');
      if (fecha.getTime() < linea.compra.fechaEfectiva.getTime()) throw new AppError(400, 'La recepción no puede ser anterior a la compra.');
      const qty = milesimas(datos.cantidad, false);
      if (qty > pendienteLinea(linea).pendiente) throw new AppError(409, 'La recepción supera la cantidad pendiente de la línea.');
      const movement = await registrarMovimiento(tx, {
        articuloId: linea.articulo.id, tipo: 'ENTRADA', referencia: datos.referencia, fechaEfectiva: datos.fechaEfectiva,
        cantidad: datos.cantidad, costoUnitario: linea.costoUnitario.toFixed(6), observacion: datos.observacion?.trim() || `Recepción ${datos.referencia}`,
      }, autorId);
      const changed = await tx.lineaCompraGerencial.updateMany({ where: { id, version: datos.version }, data: { version: { increment: 1 } } });
      if (!changed.count) throw new AppError(409, 'La línea cambió durante la recepción.');
      await tx.recepcionGerencial.create({ data: {
        lineaId: id, cantidad: datos.cantidad, fechaEfectiva: fecha, referencia: datos.referencia, movimientoId: movement.id, autorId, observacion: datos.observacion ?? null,
      } });
      return detalle(linea.compra.id, tx);
    });
  } catch (error) { conflictoCompra(error); }
}

export async function cancelarPendiente(id: number, datos: CancelarPendiente, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  try {
    return await ejecutarIdempotente({ tipo: 'USUARIO', id: autorId }, 'fuentes.logistica.compras.cancelar-pendiente', clave, { id, ...datos }, async tx => {
      const linea = await lineaParaCambio(id, tx);
      if (linea.version !== datos.version) throw new AppError(409, 'La línea cambió. Actualiza los datos antes de cancelar pendiente.');
      if (linea.version >= 2_147_483_647) throw new AppError(409, 'La línea alcanzó su límite de actualizaciones.');
      const fecha = new Date(datos.fechaEfectiva);
      if (fecha.getTime() > Date.now()) throw new AppError(400, 'La fecha de cancelación no puede estar en el futuro.');
      const ultimaRecepcion = linea.recepciones.reduce<Date | null>((actual, item) => !actual || item.fechaEfectiva > actual ? item.fechaEfectiva : actual, null);
      const limiteInferior = ultimaRecepcion && ultimaRecepcion > linea.compra.fechaEfectiva ? ultimaRecepcion : linea.compra.fechaEfectiva;
      if (fecha.getTime() < limiteInferior.getTime()) throw new AppError(400, 'La cancelación debe ser posterior a la compra y a sus recepciones.');
      const pendiente = pendienteLinea(linea).pendiente;
      if (pendiente <= 0n) throw new AppError(409, 'La línea no tiene cantidad pendiente por cancelar.');
      const changed = await tx.lineaCompraGerencial.updateMany({ where: { id, version: datos.version, canceladaEn: null }, data: {
        canceladaEn: fecha, cantidadCancelada: decimalFijo(pendiente, 3), motivoCancelacion: datos.motivo, version: { increment: 1 },
      } });
      if (!changed.count) throw new AppError(409, 'La línea cambió durante la cancelación.');
      return detalle(linea.compra.id, tx);
    });
  } catch (error) { conflictoCompra(error); }
}

function conflictoCompra(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AppError(409, 'La referencia o línea de compra ya está registrada.');
    if (error.code === 'P2003') throw new AppError(404, 'Un artículo o autor de la compra no existe.');
    if (error.code === 'P2025') throw new AppError(404, 'El registro solicitado no existe.');
    if (error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza e inténtalo de nuevo.');
  }
  throw error;
}
