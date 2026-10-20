import type { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente, type ActorOperacion } from '../../../../infrastructure/idempotencia.js';
import { ErrorDominioCotizacion } from '../domain/dinero.js';
import { accionesPermitidasCotizacion, decidirCotizacion as decidirDominio, enviarCotizacion, estadoEfectivoCotizacion } from '../domain/estado.js';
import * as repository from '../infrastructure/cotizaciones.repository.js';
import type { CotizacionConDetalle } from '../infrastructure/cotizaciones.repository.js';
import type { EstadoCotizacionPersistido } from '../domain/estado.js';
import type { ActualizarCotizacionInput, CrearCotizacionInput, ListarCotizacionesInput } from './cotizaciones.schema.js';

export type ActorDecision = { tipo: 'USUARIO'; usuarioId: number } | { tipo: 'PORTAL'; cuentaId: number; clienteId: number };
const fecha = (value: Date | null | undefined) => value?.toISOString() ?? null;
function decimalFijo(value: unknown, escala: number): string | null {
  if (value === null || value === undefined) return null;
  const [entero, fraccion = ''] = String(value).split('.');
  return `${entero}.${(fraccion + '0'.repeat(escala)).slice(0, escala)}`;
}
function traducirDominio<T>(operacion: () => T): T {
  try { return operacion(); } catch (error) {
    traducirErrorDominio(error);
  }
}
function traducirErrorDominio(error: unknown): never {
  if (error instanceof ErrorDominioCotizacion) {
    const conflicto = ['TRANSICION_INVALIDA', 'COTIZACION_VENCIDA', 'VENCIMIENTO_NO_FUTURO', 'CLIENTE_INACTIVO', 'CANTIDAD_LINEAS_INVALIDA'].includes(error.codigo);
    throw new AppError(conflicto ? 409 : 400, error.message);
  }
  throw error;
}

type CotizacionListado = Prisma.CotizacionComercialGetPayload<{ include: { venta: { select: { id: true } } } }>;
function encabezado(row: CotizacionConDetalle | CotizacionListado, ahora = new Date()) {
  const estadoPersistido = row.estado as EstadoCotizacionPersistido;
  const estadoEfectivo = estadoEfectivoCotizacion(estadoPersistido, row.venceEn, { ahora: () => ahora });
  return {
    id: row.id, clienteId: row.clienteId, clienteNombreRegistrado: row.clienteNombreRegistrado,
    clienteIdentificacionRegistrada: row.clienteIdentificacionRegistrada ?? null, contactoId: row.contactoId ?? null,
    estadoPersistido, estadoEfectivo, decisionOrigen: row.decisionOrigen ?? null, decisionComentario: row.decisionComentario ?? null,
    moneda: row.moneda, subtotal: decimalFijo(row.subtotal, 2), descuento: decimalFijo(row.descuento, 2), total: decimalFijo(row.total, 2),
    venceEn: fecha(row.venceEn), version: row.version, creadaEn: fecha(row.creadaEn), actualizadaEn: fecha(row.actualizadaEn),
    enviadaEn: fecha(row.enviadaEn), decididaEn: fecha(row.decididaEn), ventaId: row.venta?.id ?? null,
    accionesPermitidas: { ...accionesPermitidasCotizacion(estadoPersistido, row.venceEn, { ahora: () => ahora }), convertirVenta: false },
  };
}
function detalleDto(row: CotizacionConDetalle | null) {
  if (!row) throw new AppError(404, 'La cotización no existe.');
  return { ...encabezado(row), nota: row.nota ?? null, creadaPorId: row.creadaPorId,
    lineas: row.lineas.map(linea => ({ id: linea.id, posicion: linea.posicion, conceptoId: linea.conceptoId, descripcion: linea.descripcion, tipo: linea.tipo, unidad: linea.unidad, cantidad: decimalFijo(linea.cantidad, 3), precio: decimalFijo(linea.precio, 2), descuento: decimalFijo(linea.descuento, 2), subtotal: decimalFijo(linea.subtotal, 2), total: decimalFijo(linea.total, 2) })),
    notas: row.notas.map(nota => ({ id: nota.id, texto: nota.texto, autor: { id: nota.autor.id, nombre: nota.autor.identificador }, creadaEn: fecha(nota.creadaEn) })),
  };
}
type ResultadoErrorCotizacion = { tipo: 'no-encontrada'|'cliente-no-encontrado'|'contacto-no-encontrado'|'conflicto'|'estado-invalido'|'cliente-inactivo'|'contacto-inactivo'|'vencida' };
function assertResultado<T extends { tipo: string }>(result: T): Exclude<T, ResultadoErrorCotizacion> {
  if (result.tipo === 'no-encontrada' || result.tipo === 'cliente-no-encontrado' || result.tipo === 'contacto-no-encontrado') throw new AppError(404, 'El recurso solicitado no existe.');
  if (result.tipo === 'conflicto' || result.tipo === 'estado-invalido' || result.tipo === 'cliente-inactivo' || result.tipo === 'contacto-inactivo' || result.tipo === 'vencida') {
    throw new AppError(409, result.tipo === 'vencida' ? 'La cotización vencida no admite decisión.' : result.tipo === 'contacto-inactivo' ? 'El contacto está inactivo.' : result.tipo === 'cliente-inactivo' ? 'El cliente está inactivo.' : 'La cotización cambió o ya no admite esta acción.');
  }
  return result as Exclude<T, ResultadoErrorCotizacion>;
}
function actorParaIdempotencia(actor: ActorDecision): ActorOperacion {
  return actor.tipo === 'USUARIO' ? { tipo: 'USUARIO', id: actor.usuarioId } : { tipo: 'PORTAL', id: actor.cuentaId };
}

export async function listarCotizaciones(filtros: ListarCotizacionesInput) {
  const ahora = new Date();
  const rows = await repository.listar(filtros, ahora);
  return { items: rows.slice(0, filtros.limite).map(row => encabezado(row, ahora)), pagina: filtros.pagina, limite: filtros.limite, hayMas: rows.length > filtros.limite };
}
export async function obtenerCotizacion(id: number) { return detalleDto(await repository.detalle(id)); }
export async function crearCotizacion(datos: CrearCotizacionInput, usuarioId: number, clave: string) {
  try {
    return await ejecutarIdempotente({ tipo: 'USUARIO', id: usuarioId }, 'comercial.cotizaciones.crear', claveIdempotencia(clave), datos, async tx => {
      if (new Date(datos.venceEn).getTime() <= Date.now()) throw new AppError(400, 'La fecha de vencimiento debe estar en el futuro.');
      const result = assertResultado(await repository.crearEn(tx, datos, usuarioId));
      return detalleDto(result.cotizacion);
    });
  } catch (error) { traducirErrorDominio(error); }
}
export async function actualizarCotizacion(id: number, datos: ActualizarCotizacionInput) {
  try {
    if (datos.venceEn && new Date(datos.venceEn).getTime() <= Date.now()) throw new AppError(400, 'La fecha de vencimiento debe estar en el futuro.');
    return detalleDto(assertResultado(await repository.actualizar(id, datos)).cotizacion);
  }
  catch (error) { traducirErrorDominio(error); }
}
export async function enviarCotizacionPorId(id: number, version: number, usuarioId: number, clave: string) {
  return ejecutarIdempotente({ tipo: 'USUARIO', id: usuarioId }, 'comercial.cotizaciones.enviar', claveIdempotencia(clave), { id, version }, async tx => {
    const current = await repository.detalle(id, tx);
    if (!current) throw new AppError(404, 'La cotización no existe.');
    const contactActivo = current.contactoId === null || (await repository.contacto(current.clienteId, current.contactoId, tx))?.activo === true;
    const clienteActivo = current.cliente.activo;
    const enviado = traducirDominio(() => enviarCotizacion(current.estado as EstadoCotizacionPersistido, { venceEn: current.venceEn, numeroLineas: current.lineas.length, clienteActivo: clienteActivo && contactActivo }));
    const result = assertResultado(await repository.marcarEnviadaEn(tx, id, version, enviado.enviadaEn));
    return detalleDto(result.cotizacion);
  });
}
export async function decidirCotizacion(id: number, datos: { version: number; decision: 'APROBADA'|'RECHAZADA'; comentario?: string }, actor: ActorDecision, clave: string) {
  const key = claveIdempotencia(clave);
  return ejecutarIdempotente(actorParaIdempotencia(actor), 'comercial.cotizaciones.decision', key, { id, ...datos }, async tx => {
    const current = await repository.detalle(id, tx);
    if (!current || (actor.tipo === 'PORTAL' && current.clienteId !== actor.clienteId)) throw new AppError(404, 'La cotización no existe.');
    if (actor.tipo === 'PORTAL' && current.estado === 'BORRADOR') throw new AppError(404, 'La cotización no existe.');
    const now = new Date();
    traducirDominio(() => decidirDominio(current.estado as EstadoCotizacionPersistido, current.venceEn, datos.decision, { ahora: () => now }));
    const result = assertResultado(await repository.decidirEn(tx, id, datos.version, datos.decision, actor.tipo === 'USUARIO' ? 'INTERNO' : 'PORTAL', actor.tipo === 'USUARIO' ? actor.usuarioId : actor.cuentaId, now, datos.comentario?.trim() || null));
    return actor.tipo === 'PORTAL' ? proyeccionPortal(detalleDto(result.cotizacion)) : detalleDto(result.cotizacion);
  });
}
export async function crearNotaCotizacion(id: number, texto: string, usuarioId: number, clave: string) {
  return ejecutarIdempotente({ tipo: 'USUARIO', id: usuarioId }, 'comercial.cotizaciones.nota', claveIdempotencia(clave), { id, texto }, async tx => {
    const result = assertResultado(await repository.crearNotaEn(tx, id, usuarioId, texto));
    return detalleDto(result.cotizacion);
  });
}

function proyeccionPortal(dto: ReturnType<typeof detalleDto>) {
  if (dto.estadoPersistido === 'BORRADOR') throw new AppError(404, 'La cotización no existe.');
  return { id: dto.id, version: dto.version, estadoPersistido: dto.estadoPersistido, estadoEfectivo: dto.estadoEfectivo, moneda: dto.moneda,
    subtotal: dto.subtotal, descuento: dto.descuento, total: dto.total, venceEn: dto.venceEn, enviadaEn: dto.enviadaEn, decididaEn: dto.decididaEn,
    accionesPermitidas: { decidir: dto.accionesPermitidas.decidir },
    decisionComentario: dto.decisionOrigen === 'PORTAL' ? dto.decisionComentario : null,
    lineas: dto.lineas.map(linea => ({ id: linea.id, posicion: linea.posicion, descripcion: linea.descripcion, unidad: linea.unidad, cantidad: linea.cantidad, precio: linea.precio, descuento: linea.descuento, subtotal: linea.subtotal, total: linea.total })),
  };
}
export async function obtenerCotizacionPortal(clienteId: number, id: number) {
  const row = await repository.detalle(id);
  if (!row || row.clienteId !== clienteId || row.estado === 'BORRADOR') throw new AppError(404, 'La cotización no existe.');
  return proyeccionPortal(detalleDto(row));
}
