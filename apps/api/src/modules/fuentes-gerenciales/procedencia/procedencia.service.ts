import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import type { AreaCobertura } from '../contracts/gerenciales.types.js';

const asIso = (value: Date | null) => value?.toISOString() ?? null;
const nombre = (usuario: { identificador: string; empleado: { persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } | null } | null }) => {
  const persona = usuario.empleado?.persona;
  return persona ? [persona.firstName, persona.secondName, persona.firstLastName, persona.secondLastName].filter(Boolean).join(' ') : usuario.identificador;
};
const aCobertura = (row: { area: string; desde: Date; hastaVerificada: Date; observacion: string | null; version: number; responsable: Parameters<typeof nombre>[0] & { id: number }; }) => ({
  area: row.area as AreaCobertura, desde: row.desde.toISOString(), hastaVerificada: row.hastaVerificada.toISOString(),
  responsable: { id: row.responsable.id, nombre: nombre(row.responsable) },
  observacion: row.observacion, version: row.version,
});

export async function listarCoberturas() {
  const rows = await prisma.coberturaGerencial.findMany({ include: { responsable: { include: { empleado: { include: { persona: true } } } } }, orderBy: { area: 'asc' } });
  return rows.map(aCobertura);
}

export async function guardarCobertura(area: AreaCobertura, body: { version: number; desde: string; hastaVerificada: string; observacion?: string }, usuarioId: number, ahora = new Date()) {
  const desde = new Date(body.desde), hasta = new Date(body.hastaVerificada);
  if (desde >= hasta || hasta > ahora) throw new AppError(400, 'La cobertura requiere desde < hastaVerificada <= ahora.');
  return prisma.$transaction(async tx => {
    const anterior = await tx.coberturaGerencial.findUnique({ where: { area }, include: { responsable: { include: { empleado: { include: { persona: true } } } } } });
    if (body.version === 0) {
      if (anterior) throw new AppError(409, 'La cobertura ya existe; vuelve a cargarla antes de actualizar.');
      const row = await tx.coberturaGerencial.create({ data: { area, desde, hastaVerificada: hasta, responsableId: usuarioId, observacion: body.observacion ?? null, version: 1 }, include: { responsable: { include: { empleado: { include: { persona: true } } } } } });
      await tx.auditoria.create({ data: { usuarioId, tipoActor: 'USUARIO', entidad: 'CoberturaGerencial', entidadId: area, accion: 'CREAR', datosAnteriores: Prisma.JsonNull, datosNuevos: { area, desde: desde.toISOString(), hastaVerificada: hasta.toISOString(), observacion: row.observacion, responsableId: usuarioId, version: row.version } } });
      return aCobertura(row);
    }
    if (!anterior) throw new AppError(409, 'La cobertura no existe; usa version 0 para crearla.');
    if (anterior.version !== body.version) throw new AppError(409, 'La cobertura cambió. Actualiza los datos antes de guardar.');
    const update = await tx.coberturaGerencial.updateMany({ where: { id: anterior.id, version: body.version }, data: { desde, hastaVerificada: hasta, responsableId: usuarioId, observacion: body.observacion ?? null, version: { increment: 1 } } });
    if (!update.count) throw new AppError(409, 'La cobertura cambió. Actualiza los datos antes de guardar.');
    const row = await tx.coberturaGerencial.findUniqueOrThrow({ where: { id: anterior.id }, include: { responsable: { include: { empleado: { include: { persona: true } } } } } });
    await tx.auditoria.create({ data: { usuarioId, tipoActor: 'USUARIO', entidad: 'CoberturaGerencial', entidadId: area, accion: 'ACTUALIZAR', datosAnteriores: { area, desde: anterior.desde.toISOString(), hastaVerificada: anterior.hastaVerificada.toISOString(), observacion: anterior.observacion, responsableId: anterior.responsableId, version: anterior.version }, datosNuevos: { area, desde: desde.toISOString(), hastaVerificada: hasta.toISOString(), observacion: row.observacion, responsableId: usuarioId, version: row.version } } });
    return aCobertura(row);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function historialCobertura(area: AreaCobertura, pagina: number, limite: number) {
  const rows = await prisma.auditoria.findMany({ where: { entidad: 'CoberturaGerencial', entidadId: area }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], skip: (pagina - 1) * limite, take: limite + 1, include: { usuario: { select: { id: true, identificador: true, empleado: { select: { persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } } } } });
  const hayMas = rows.length > limite;
  const snapshot = (value: Prisma.JsonValue | null) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const item = value as Record<string, Prisma.JsonValue>;
    return { area: String(item.area ?? area), desde: String(item.desde ?? ''), hastaVerificada: String(item.hastaVerificada ?? ''), observacion: typeof item.observacion === 'string' ? item.observacion : null, responsableId: typeof item.responsableId === 'number' ? item.responsableId : null, version: typeof item.version === 'number' ? item.version : 0 };
  };
  return { items: rows.slice(0, limite).map(row => ({ id: row.id, fecha: row.fecha.toISOString(), accion: row.accion, responsable: row.usuario ? { id: row.usuario.id, nombre: nombre(row.usuario) } : null, anteriores: snapshot(row.datosAnteriores), nuevos: snapshot(row.datosNuevos) })), pagina, limite, hayMas };
}
