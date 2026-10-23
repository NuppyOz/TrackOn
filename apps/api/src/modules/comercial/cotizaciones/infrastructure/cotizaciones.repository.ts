import { Prisma } from '@prisma/client';
import { prisma } from '../../../../infrastructure/prisma.js';
import { calcularLineaCotizacion, sumarTotalesCotizacion } from '../domain/dinero.js';
import { resolverTarifa } from '../../tarifas/tarifas.service.js';
import type { ActualizarCotizacionInput, CrearCotizacionInput, ListarCotizacionesInput } from '../application/cotizaciones.schema.js';

export type DbCotizaciones = typeof prisma | Prisma.TransactionClient;
const selectCotizacion = {
  cliente: { select: { id: true, activo: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true, numberDocument: true } }, organizacion: { select: { razonSocial: true, nombreComercial: true, identificacionTributaria: true } } } },
  lineas: { orderBy: { posicion: 'asc' as const } },
  notas: { orderBy: [{ creadaEn: 'asc' as const }, { id: 'asc' as const }], select: { id: true, texto: true, creadaEn: true, autor: { select: { id: true, identificador: true } } } },
  venta: { select: { id: true } },
} satisfies Prisma.CotizacionComercialInclude;
export type CotizacionConDetalle = Prisma.CotizacionComercialGetPayload<{ include: typeof selectCotizacion }>;

export async function detalle(id: number, db: DbCotizaciones = prisma): Promise<CotizacionConDetalle | null> {
  return await db.cotizacionComercial.findUnique({ where: { id }, include: selectCotizacion }) as CotizacionConDetalle | null;
}
export function cliente(id: number, db: DbCotizaciones = prisma) {
  return db.cliente.findUnique({ where: { id }, select: { id: true, activo: true, persona: true, organizacion: true } });
}
export function contacto(clienteId: number, contactoId: number, db: DbCotizaciones = prisma) {
  return db.contactoComercial.findFirst({ where: { id: contactoId, clienteId }, select: { id: true, activo: true } });
}

export async function crearEn(tx: Prisma.TransactionClient, datos: CrearCotizacionInput, usuarioId: number) {
    const client = await cliente(datos.clienteId, tx);
    if (!client) return { tipo: 'cliente-no-encontrado' as const };
    if (!client.activo) return { tipo: 'cliente-inactivo' as const };
    if (datos.contactoId !== undefined) {
      const contact = await contacto(datos.clienteId, datos.contactoId, tx);
      if (!contact) return { tipo: 'contacto-no-encontrado' as const };
      if (!contact.activo) return { tipo: 'contacto-inactivo' as const };
    }
    const snapshot = client.organizacion
      ? { nombre: client.organizacion.nombreComercial ?? client.organizacion.razonSocial, identificacion: client.organizacion.identificacionTributaria }
      : { nombre: client.persona ? [client.persona.firstName, client.persona.secondName, client.persona.firstLastName, client.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${client.id}`, identificacion: client.persona?.numberDocument ?? null };
    const lineas = await prepararLineas(datos.clienteId, datos.lineas, tx);
    const totales = totalizar(lineas);
    const creado = await tx.cotizacionComercial.create({ data: {
      clienteId: datos.clienteId, contactoId: datos.contactoId ?? null, creadaPorId: usuarioId,
      clienteNombreRegistrado: snapshot.nombre, clienteIdentificacionRegistrada: snapshot.identificacion,
      moneda: 'NIO', subtotal: totales.subtotal, descuento: totales.descuento, total: totales.total,
      venceEn: new Date(datos.venceEn), nota: datos.nota ?? null, version: 1,
      ...(lineas.length ? { lineas: { create: lineas } } : {}),
    }, select: { id: true } });
    return { tipo: 'creada' as const, cotizacion: await detalle(creado.id, tx) };
}
async function prepararLineas(clienteId: number, entradas: CrearCotizacionInput['lineas'], tx: Prisma.TransactionClient) {
  const result: { posicion: number; conceptoId: number; descripcion: string; tipo: string; unidad: string; cantidad: string; precio: string; descuento: string; subtotal: string; total: string }[] = [];
  for (let i = 0; i < entradas.length; i++) {
    const input = entradas[i]!;
    const tarifa = await resolverTarifa(clienteId, input.conceptoId, tx);
    const calculada = calcularLineaCotizacion({ cantidad: input.cantidad, precio: tarifa.precio, descuento: input.descuento });
    result.push({ posicion: i + 1, conceptoId: tarifa.concepto.id, descripcion: tarifa.concepto.nombre, tipo: tarifa.concepto.tipo, unidad: tarifa.concepto.unidad,
      cantidad: calculada.cantidad, precio: calculada.precio, descuento: calculada.descuento, subtotal: calculada.subtotal, total: calculada.total });
  }
  return result;
}
function totalizar(lineas: {subtotal:string; descuento:string; total:string}[]) {
  return { subtotal: sumarTotalesCotizacion(lineas.map(x => x.subtotal)), descuento: sumarTotalesCotizacion(lineas.map(x => x.descuento)), total: sumarTotalesCotizacion(lineas.map(x => x.total)) };
}

export async function actualizar(id: number, datos: ActualizarCotizacionInput) {
  return prisma.$transaction(async tx => {
    const actual = await detalle(id, tx);
    if (!actual) return { tipo: 'no-encontrada' as const };
    if (actual.version !== datos.version) return { tipo: 'conflicto' as const };
    if (actual.estado !== 'BORRADOR') return { tipo: 'estado-invalido' as const };
    if (!actual.cliente.activo) return { tipo: 'cliente-inactivo' as const };
    if (datos.contactoId !== undefined && datos.contactoId !== null) {
      const contact = await contacto(actual.clienteId, datos.contactoId, tx);
      if (!contact) return { tipo: 'contacto-no-encontrado' as const };
      if (!contact.activo) return { tipo: 'contacto-inactivo' as const };
    }
    const lineas = datos.lineas === undefined ? undefined : await prepararLineas(actual.clienteId, datos.lineas, tx);
    const totales = lineas === undefined ? undefined : totalizar(lineas);
    const updated = await tx.cotizacionComercial.updateMany({ where: { id, version: datos.version, estado: 'BORRADOR' }, data: {
      ...(datos.contactoId !== undefined ? { contactoId: datos.contactoId } : {}), ...(datos.venceEn ? { venceEn: new Date(datos.venceEn) } : {}),
      ...(datos.nota !== undefined ? { nota: datos.nota } : {}), ...(totales ? { subtotal: totales.subtotal, descuento: totales.descuento, total: totales.total } : {}), version: { increment: 1 },
    } });
    if (!updated.count) return { tipo: 'conflicto' as const };
    if (lineas !== undefined) {
      await tx.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: id } });
      if (lineas.length) await tx.lineaCotizacionComercial.createMany({ data: lineas.map(x => ({ ...x, cotizacionId: id })) });
    }
    return { tipo: 'actualizada' as const, cotizacion: await detalle(id, tx) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function marcarEnviadaEn(tx: Prisma.TransactionClient, id: number, version: number, enviadaEn: Date) {
    const row = await detalle(id, tx);
    if (!row) return { tipo: 'no-encontrada' as const };
    if (row.version !== version) return { tipo: 'conflicto' as const };
    if (row.estado !== 'BORRADOR') return { tipo: 'estado-invalido' as const };
    const changed = await tx.cotizacionComercial.updateMany({ where: { id, version, estado: 'BORRADOR' }, data: { estado: 'ENVIADA', enviadaEn, version: { increment: 1 } } });
    if (!changed.count) return { tipo: 'conflicto' as const };
    return { tipo: 'actualizada' as const, cotizacion: await detalle(id, tx) };
}
export async function decidirEn(tx: Prisma.TransactionClient, id: number, version: number, decision: 'APROBADA'|'RECHAZADA', origen: 'INTERNO'|'PORTAL', actorId: number, decididaEn: Date, comentario: string | null) {
    const row = await detalle(id, tx);
    if (!row) return { tipo: 'no-encontrada' as const };
    if (row.version !== version) return { tipo: 'conflicto' as const };
    if (row.estado !== 'ENVIADA') return { tipo: 'estado-invalido' as const };
    if (decididaEn.getTime() >= row.venceEn.getTime()) return { tipo: 'vencida' as const };
    const changed = await tx.cotizacionComercial.updateMany({ where: { id, version, estado: 'ENVIADA', venceEn: { gt: decididaEn } }, data: {
      estado: decision, decididaEn, decisionOrigen: origen, decisionUsuarioId: origen === 'INTERNO' ? actorId : null,
      decisionCuentaId: origen === 'PORTAL' ? actorId : null, decisionComentario: comentario, version: { increment: 1 },
    } });
    if (!changed.count) return { tipo: 'conflicto' as const };
    return { tipo: 'actualizada' as const, cotizacion: await detalle(id, tx) };
}
export async function crearNotaEn(tx: Prisma.TransactionClient, id: number, autorId: number, texto: string) {
    const row = await tx.cotizacionComercial.findUnique({ where: { id }, select: { id: true } });
    if (!row) return { tipo: 'no-encontrada' as const };
    await tx.notaCotizacionComercial.create({ data: { cotizacionId: id, autorId, texto } });
    return { tipo: 'creada' as const, cotizacion: await detalle(id, tx) };
}
export async function listar(filtros: ListarCotizacionesInput, ahora: Date) {
  const vencida = { estado: 'ENVIADA', venceEn: { lte: ahora } };
  const where: Prisma.CotizacionComercialWhereInput = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.estado === 'VENCIDA' ? vencida : filtros.estado ? { estado: filtros.estado, ...(filtros.estado === 'ENVIADA' ? { venceEn: { gt: ahora } } : {}) } : {}),
    ...(filtros.q ? { OR: [{ clienteNombreRegistrado: { contains: filtros.q, mode: 'insensitive' } }, ...( /^[1-9]\d*$/.test(filtros.q) && Number(filtros.q) <= 2_147_483_647 ? [{ id: Number(filtros.q) }] : [])] } : {}),
  };
  const orderBy = filtros.sortBy === 'id' ? [{ id: filtros.sortDir }] : [{ [filtros.sortBy]: filtros.sortDir }, { id: 'desc' as const }];
  const rows = await prisma.cotizacionComercial.findMany({ where, orderBy, skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1, include: { venta: { select: { id: true } } } });
  return rows;
}
