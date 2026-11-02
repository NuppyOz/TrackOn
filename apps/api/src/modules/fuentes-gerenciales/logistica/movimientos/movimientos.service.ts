import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { ejecutarIdempotente, claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import { milesimas, valorNano, costoMicro, decimalFijo } from '../../contracts/precision.js';
import type { ListarMovimientos, RegistrarMovimiento, RevertirMovimiento } from './movimientos.schema.js';
import { registrarMovimientoSchema, revertirMovimientoSchema } from './movimientos.schema.js';
import * as repository from './movimientos.repository.js';
import { costoPromedioMicro, decimalCantidad, decimalValor, nuevoSaldo, valorDevolucionNano, valorEntradaNano, valorSalidaNano } from './costeo.js';

type Sentido = 1 | -1;
type TipoMovimiento = 'APERTURA' | RegistrarMovimiento['tipo'] | 'REVERSO';
type MovimientoDb = NonNullable<Awaited<ReturnType<typeof repository.obtener>>>;
type ArticuloDb = NonNullable<Awaited<ReturnType<typeof repository.buscarArticulo>>>;
const actor = (id: number) => ({ tipo: 'USUARIO' as const, id });

function leerCantidadDb(value: Prisma.Decimal) { return milesimas(value.toFixed(3), true); }
function leerValorDb(value: Prisma.Decimal) { return valorNano(value.toFixed(9)); }

export function articuloDto(row: ArticuloDb) {
  const qty = leerCantidadDb(row.saldoCantidad);
  const val = leerValorDb(row.saldoValor);
  const promedio = costoPromedioMicro(qty, val);
  return {
    id: row.id, codigo: row.codigo, nombre: row.nombre, unidad: row.unidad, minimo: row.minimo.toFixed(3),
    saldoCantidad: decimalFijo(qty, 3), saldoValor: decimalFijo(val, 9), costoPromedio: promedio === null ? null : decimalFijo(promedio, 6),
    ultimaFecha: row.ultimaFecha?.toISOString() ?? null, version: row.version, materialId: row.materialId, creadoEn: row.creadoEn.toISOString(),
  };
}

function movimientoDto(row: MovimientoDb) {
  const ultimoId = row.articulo.movimientos[0]?.id;
  const puedeRevertir = ultimoId === row.id && row.derivados.length === 0 && row.recepcion === null && row.tipo !== 'APERTURA' && row.tipo !== 'REVERSO';
  return {
    id: row.id, articuloId: row.articuloId, articuloCodigo: row.articulo.codigo, articuloNombre: row.articulo.nombre, unidad: row.articulo.unidad,
    tipo: row.tipo as TipoMovimiento, sentido: row.sentido as Sentido, cantidad: row.cantidad.toFixed(3), valor: row.valor.toFixed(9),
    saldoCantidad: row.saldoCantidad.toFixed(3), saldoValor: row.saldoValor.toFixed(9), referencia: row.referencia,
    fechaEfectiva: row.fechaEfectiva.toISOString(), registradoEn: row.registradoEn.toISOString(), observacion: row.observacion,
    origenId: row.origenId, ordenId: row.ordenId, puedeRevertir,
  };
}

function valorMovimiento(tipo: TipoMovimiento, sentido: Sentido, qty: bigint, costo?: bigint, saldoQty = 0n, saldoValor = 0n, devolucion?: bigint) {
  if (tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'APERTURA') return valorEntradaNano(qty, costo ?? 0n);
  if (tipo === 'CONSUMO' || tipo === 'AJUSTE_NEGATIVO') return valorSalidaNano(saldoQty, saldoValor, qty);
  if (tipo === 'DEVOLUCION') return devolucion ?? 0n;
  // REVERSO carries the magnitude of the source event; sentido applies its opposite sign.
  if (tipo === 'REVERSO' && (sentido === 1 || sentido === -1)) return costo ?? 0n;
  throw new AppError(400, 'Tipo de movimiento no válido.');
}

async function anexarMovimiento(
  tx: Prisma.TransactionClient,
  articulo: ArticuloDb,
  data: { tipo: TipoMovimiento; sentido: Sentido; cantidad: bigint; valor: bigint; referencia: string; fechaEfectiva: Date; observacion: string; origenId?: number | null; ordenId?: number | null; autorId: number },
  opts: { actualizarSaldo: boolean },
) {
  const saldoAnteriorCantidad = leerCantidadDb(articulo.saldoCantidad);
  const saldoAnteriorValor = leerValorDb(articulo.saldoValor);
  if (opts.actualizarSaldo && articulo.version >= 2_147_483_647) throw new AppError(409, 'El artículo alcanzó su límite de actualizaciones.');
  const saldo = nuevoSaldo(saldoAnteriorCantidad, saldoAnteriorValor, data.sentido, data.cantidad, data.valor);
  if (opts.actualizarSaldo) {
    const changed = await tx.articuloGerencial.updateMany({ where: { id: articulo.id, version: articulo.version }, data: {
      saldoCantidad: decimalCantidad(saldo.cantidad), saldoValor: decimalValor(saldo.valor), ultimaFecha: data.fechaEfectiva, version: { increment: 1 },
    } });
    if (!changed.count) throw new AppError(409, 'El saldo del artículo cambió; vuelve a consultar e inténtalo de nuevo.');
  }
  return repository.crear(tx, {
    articuloId: articulo.id, tipo: data.tipo, sentido: data.sentido, cantidad: decimalCantidad(data.cantidad), valor: decimalValor(data.valor),
    saldoCantidad: decimalCantidad(saldo.cantidad), saldoValor: decimalValor(saldo.valor), referencia: data.referencia,
    fechaEfectiva: data.fechaEfectiva, observacion: data.observacion, origenId: data.origenId ?? null, ordenId: data.ordenId ?? null, autorId: data.autorId,
  });
}

async function calcularDevolucion(tx: Prisma.TransactionClient, articuloId: number, origenId: number, cantidad: bigint) {
  const origen = await tx.movimientoGerencial.findUnique({ where: { id: origenId } });
  if (!origen || origen.articuloId !== articuloId || origen.tipo !== 'CONSUMO') throw new AppError(404, 'El consumo de origen no existe para este artículo.');
  if (await repository.tieneReverso(tx, origen.id)) throw new AppError(409, 'No se puede devolver un consumo revertido.');
  const devoluciones = await repository.porOrigen(tx, origen.id);
  const activas = devoluciones.filter(item => item.derivados.length === 0);
  const qtyDevuelta = activas.reduce((sum, item) => sum + leerCantidadDb(item.cantidad), 0n);
  const valorDevuelto = activas.reduce((sum, item) => sum + leerValorDb(item.valor), 0n);
  const cantidadConsumo = leerCantidadDb(origen.cantidad);
  const valorConsumo = leerValorDb(origen.valor);
  return valorDevolucionNano(cantidadConsumo, valorConsumo, qtyDevuelta, valorDevuelto, cantidad);
}

async function registrarMovimientoEn(tx: Prisma.TransactionClient, input: RegistrarMovimiento, autorId: number, ahora: Date) {
  const articulo = await repository.buscarArticulo(tx, input.articuloId);
  if (!articulo) throw new AppError(404, 'El artículo no existe.');
  const fecha = new Date(input.fechaEfectiva);
  if (fecha.getTime() > ahora.getTime()) throw new AppError(400, 'La fecha efectiva no puede estar en el futuro.');
  if (articulo.ultimaFecha && fecha.getTime() < articulo.ultimaFecha.getTime()) throw new AppError(409, 'La fecha debe ser igual o posterior al último movimiento del artículo.');
  if (input.ordenId && !await repository.ordenExiste(tx, input.ordenId)) throw new AppError(404, 'La orden de trabajo no existe.');

  const cantidad = milesimas(input.cantidad, false);
  const saldoQty = leerCantidadDb(articulo.saldoCantidad);
  const saldoValor = leerValorDb(articulo.saldoValor);
  const tipo = input.tipo;
  const sentido: Sentido = tipo === 'ENTRADA' || tipo === 'DEVOLUCION' || tipo === 'AJUSTE_POSITIVO' ? 1 : -1;
  const costo = input.costoUnitario === undefined ? undefined : costoMicro(input.costoUnitario);
  const valor = tipo === 'DEVOLUCION'
    ? await calcularDevolucion(tx, articulo.id, input.origenId!, cantidad)
    : valorMovimiento(tipo, sentido, cantidad, costo, saldoQty, saldoValor);
  return anexarMovimiento(tx, articulo, {
    tipo, sentido, cantidad, valor, referencia: input.referencia, fechaEfectiva: fecha, observacion: input.observacion ?? '',
    origenId: input.origenId, ordenId: input.ordenId, autorId,
  }, { actualizarSaldo: true });
}

/** Append-only movement operation for purchase receiving; the caller owns the transaction. */
export async function registrarMovimiento(tx: Prisma.TransactionClient, body: RegistrarMovimiento, autorId: number, ahora = new Date()) {
  const input = registrarMovimientoSchema.parse(body);
  if (!Number.isSafeInteger(autorId) || autorId < 1) throw new AppError(401, 'Se requiere un autor autenticado.');
  return movimientoDto(await registrarMovimientoEn(tx, input, autorId, ahora));
}

export async function listarMovimientos(filtros: ListarMovimientos) {
  const rows = await repository.listar(filtros);
  return { items: rows.slice(0, filtros.limite).map(movimientoDto), pagina: filtros.pagina, limite: filtros.limite, hayMas: rows.length > filtros.limite };
}
export async function obtenerMovimiento(id: number) {
  const row = await repository.obtener(id);
  if (!row) throw new AppError(404, 'El movimiento no existe.');
  return movimientoDto(row);
}

export async function crearMovimiento(input: RegistrarMovimiento, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  const data = registrarMovimientoSchema.parse(input);
  try {
    return await ejecutarIdempotente(actor(autorId), 'fuentes.logistica.movimientos.crear', clave, data, async tx => {
      return registrarMovimiento(tx, data, autorId);
    });
  } catch (error) { conflicto(error); }
}

export async function revertirMovimiento(id: number, input: RevertirMovimiento, autorId: number, key: string) {
  const clave = claveIdempotencia(key);
  const data = revertirMovimientoSchema.parse(input);
  try {
    return await ejecutarIdempotente(actor(autorId), 'fuentes.logistica.movimientos.revertir', clave, { id, ...data }, async tx => {
      const objetivo = await repository.obtener(id, tx);
      if (!objetivo) throw new AppError(404, 'El movimiento no existe.');
      if (objetivo.tipo === 'APERTURA' || objetivo.tipo === 'REVERSO') throw new AppError(409, 'Este tipo de movimiento no se puede revertir.');
      if (objetivo.derivados.length || objetivo.recepcion) throw new AppError(409, 'El movimiento tiene hechos derivados y no se puede revertir.');
      const ultimo = await repository.ultimo(tx, objetivo.articuloId);
      if (ultimo?.id !== objetivo.id) throw new AppError(409, 'Solo se puede revertir el movimiento más reciente del artículo.');
      const fecha = new Date(data.fechaEfectiva);
      const ahora = new Date();
      if (fecha.getTime() > ahora.getTime()) throw new AppError(400, 'La fecha efectiva no puede estar en el futuro.');
      if (fecha.getTime() < ultimo.fechaEfectiva.getTime()) throw new AppError(409, 'La fecha debe ser igual o posterior al último movimiento del artículo.');
      const articulo = await repository.buscarArticulo(tx, objetivo.articuloId);
      if (!articulo) throw new AppError(404, 'El artículo no existe.');
      const nuevo = await anexarMovimiento(tx, articulo, {
        tipo: 'REVERSO', sentido: (objetivo.sentido === 1 ? -1 : 1), cantidad: leerCantidadDb(objetivo.cantidad), valor: leerValorDb(objetivo.valor),
        referencia: data.referencia, fechaEfectiva: fecha, observacion: data.observacion ?? '', origenId: objetivo.id, autorId,
      }, { actualizarSaldo: true });
      return movimientoDto(nuevo);
    });
  } catch (error) { conflicto(error); }
}

export function conflicto(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AppError(409, 'La referencia o identidad ya está registrada.');
    if (error.code === 'P2003') throw new AppError(404, 'Una referencia asociada no existe.');
    if (error.code === 'P2025') throw new AppError(404, 'El registro solicitado no existe.');
    if (error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza e inténtalo de nuevo.');
  }
  throw error;
}
