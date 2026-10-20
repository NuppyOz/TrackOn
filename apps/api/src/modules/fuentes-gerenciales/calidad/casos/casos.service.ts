import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import { nombreCliente, verificarReferenciasCliente } from './shared/relaciones.js';
import type { CerrarCasoInput, CrearCasoInput, CrearCorrectivaInput, CrearRetrabajoInput, ListarCasosInput, ResponderCasoInput, ResolverCasoInput } from './casos.schema.js';
const includeCasoCabecera = {
  cliente: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } }, organizacion: { select: { razonSocial: true, nombreComercial: true } } } },
  garantia: { select: { id: true, referencia: true } },
} satisfies Prisma.CasoCalidadGerencialInclude;
const includeCasoDetalle = {
  ...includeCasoCabecera,
  retrabajos: { orderBy: [{ fechaEfectiva: 'desc' as const }, { id: 'desc' as const }] },
  correctivas: { include: { responsable: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } }, orderBy: [{ creadaEn: 'desc' as const }, { id: 'desc' as const }] },
} satisfies Prisma.CasoCalidadGerencialInclude;
type CasoDetalle = Prisma.CasoCalidadGerencialGetPayload<{ include: typeof includeCasoDetalle }>;
type CasoCabecera = Prisma.CasoCalidadGerencialGetPayload<{ include: typeof includeCasoCabecera }>;
export type EstadoCaso = 'ABIERTO' | 'EN_ATENCION' | 'RESUELTO' | 'CERRADO';

export function validarEquipoGarantia(equipoCaso: number | undefined, equipoGarantia: number | null) {
  if (equipoCaso !== undefined && equipoGarantia !== null && equipoCaso !== equipoGarantia) {
    throw new AppError(400, 'El equipo explícito del caso no coincide con el equipo de la garantía.');
  }
}

export function estadoCaso(row: Pick<CasoDetalle, 'respondidaEn' | 'resueltaEn' | 'cerradaEn'>): EstadoCaso {
  if (row.cerradaEn !== null) return 'CERRADO';
  if (row.resueltaEn !== null) return 'RESUELTO';
  if (row.respondidaEn !== null) return 'EN_ATENCION';
  return 'ABIERTO';
}

function cabeceraDto(row: CasoCabecera) {
  return {
    id: row.id, referencia: row.referencia, clienteId: row.clienteId, clienteNombre: nombreCliente(row.cliente),
    activoReferencia: row.activoReferencia, codigoFalla: row.codigoFalla, descripcion: row.descripcion,
    equipoId: row.equipoId, ordenId: row.ordenId, garantiaId: row.garantiaId, garantiaReferencia: row.garantia?.referencia ?? null,
    anteriorId: row.anteriorId, abiertaEn: row.abiertaEn.toISOString(), respuestaLimiteEn: row.respuestaLimiteEn?.toISOString() ?? null,
    resolucionLimiteEn: row.resolucionLimiteEn?.toISOString() ?? null, respondidaEn: row.respondidaEn?.toISOString() ?? null,
    resueltaEn: row.resueltaEn?.toISOString() ?? null, cerradaEn: row.cerradaEn?.toISOString() ?? null,
    resultado: row.resultado, causaRaiz: row.causaRaiz, registradaEn: row.registradaEn.toISOString(), version: row.version,
    estado: estadoCaso(row),
  };
}

function detalleDto(row: CasoDetalle) {
  return {
    ...cabeceraDto(row),
    retrabajos: row.retrabajos.map(retrabajo => ({ id: retrabajo.id, casoId: retrabajo.casoId, referenciaTrabajo: retrabajo.referenciaTrabajo, fechaEfectiva: retrabajo.fechaEfectiva.toISOString(), motivo: retrabajo.motivo, ordenId: retrabajo.ordenId, registradoEn: retrabajo.registradoEn.toISOString() })),
    correctivas: row.correctivas.map(correctiva => ({ id: correctiva.id, casoId: correctiva.casoId, casoReferencia: row.referencia, descripcion: correctiva.descripcion,
      responsableId: correctiva.responsableId, responsableNombre: nombreEmpleado(correctiva.responsable), creadaEn: correctiva.creadaEn.toISOString(), venceEn: correctiva.venceEn.toISOString(),
      cerradaEn: correctiva.cerradaEn?.toISOString() ?? null, resultado: correctiva.resultado, version: correctiva.version })),
  };
}

function nombreEmpleado(empleado: { id: number; persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null } }) {
  return [empleado.persona.firstName, empleado.persona.secondName, empleado.persona.firstLastName, empleado.persona.secondLastName].filter(Boolean).join(' ');
}

function whereEstado(estado: ListarCasosInput['estado']): Prisma.CasoCalidadGerencialWhereInput | undefined {
  if (estado === 'ABIERTO') return { respondidaEn: null, resueltaEn: null, cerradaEn: null };
  if (estado === 'EN_ATENCION') return { respondidaEn: { not: null }, resueltaEn: null, cerradaEn: null };
  if (estado === 'RESUELTO') return { resueltaEn: { not: null }, cerradaEn: null };
  if (estado === 'CERRADO') return { cerradaEn: { not: null } };
  return undefined;
}

export async function listarCasos(filtros: ListarCasosInput) {
  const where: Prisma.CasoCalidadGerencialWhereInput = {
    ...(filtros.clienteId !== undefined ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.activoReferencia ? { activoReferencia: filtros.activoReferencia } : {}),
    ...(filtros.codigoFalla ? { codigoFalla: filtros.codigoFalla } : {}),
    ...(filtros.abiertaAntes ? { abiertaEn: { lt: new Date(filtros.abiertaAntes) } } : {}),
    ...(filtros.estado ? whereEstado(filtros.estado) : {}),
    ...(filtros.q ? { OR: [
      { referencia: { contains: filtros.q, mode: 'insensitive' } },
      { activoReferencia: { contains: filtros.q, mode: 'insensitive' } },
      { codigoFalla: { contains: filtros.q, mode: 'insensitive' } },
    ] } : {}),
  };
  const rows = await prisma.casoCalidadGerencial.findMany({ where, include: includeCasoCabecera, orderBy: [{ abiertaEn: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 });
  const hayMas = rows.length > filtros.limite;
  return { items: rows.slice(0, filtros.limite).map(row => cabeceraDto(row)), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtenerCaso(id: number) {
  const row = await prisma.casoCalidadGerencial.findUnique({ where: { id }, include: includeCasoDetalle });
  if (!row) throw new AppError(404, 'El caso de calidad no existe.');
  return detalleDto(row);
}

export async function crearCaso(tx: Prisma.TransactionClient, input: CrearCasoInput, autorId: number, ahora = new Date()) {
  const abiertaEn = new Date(input.abiertaEn);
  if (abiertaEn > ahora) throw new AppError(400, 'La fecha de apertura no puede ser futura.');
  await verificarReferenciasCliente(tx, { clienteId: input.clienteId, equipoId: input.equipoId, ordenId: input.ordenId });

  if (input.garantiaId !== undefined) {
    const garantia = await tx.garantiaGerencial.findUnique({ where: { id: input.garantiaId }, select: { id: true, referencia: true, clienteId: true, activoReferencia: true, equipoId: true, ordenId: true } });
    if (!garantia) throw new AppError(404, 'La garantía indicada no existe.');
    if (garantia.clienteId !== input.clienteId || garantia.activoReferencia !== input.activoReferencia) throw new AppError(400, 'La garantía debe corresponder al mismo cliente y activo del caso.');
    validarEquipoGarantia(input.equipoId, garantia.equipoId);
    const equipoEfectivo = input.equipoId ?? garantia.equipoId ?? undefined;
    if (equipoEfectivo !== undefined) await verificarReferenciasCliente(tx, { clienteId: input.clienteId, equipoId: equipoEfectivo, ordenId: input.ordenId });
  }

  if (input.anteriorId !== undefined) {
    const anterior = await tx.casoCalidadGerencial.findUnique({ where: { id: input.anteriorId }, select: { id: true, clienteId: true, activoReferencia: true, codigoFalla: true, abiertaEn: true } });
    if (!anterior) throw new AppError(404, 'El caso anterior indicado no existe.');
    if (anterior.clienteId !== input.clienteId || anterior.activoReferencia !== input.activoReferencia || anterior.codigoFalla !== input.codigoFalla) throw new AppError(400, 'El caso anterior debe pertenecer al mismo cliente, activo y tipo de falla.');
    if (anterior.abiertaEn >= abiertaEn) throw new AppError(400, 'El caso anterior debe haberse abierto antes que el nuevo caso.');
  }

  const row = await tx.casoCalidadGerencial.create({ data: {
    referencia: input.referencia, clienteId: input.clienteId, activoReferencia: input.activoReferencia,
    codigoFalla: input.codigoFalla, descripcion: input.descripcion, equipoId: input.equipoId ?? null,
    ordenId: input.ordenId ?? null, garantiaId: input.garantiaId ?? null, anteriorId: input.anteriorId ?? null,
    abiertaEn, respuestaLimiteEn: input.respuestaLimiteEn ? new Date(input.respuestaLimiteEn) : null,
    resolucionLimiteEn: input.resolucionLimiteEn ? new Date(input.resolucionLimiteEn) : null,
    autorId,
  }, include: includeCasoDetalle });
  return detalleDto(row);
}

async function detalleEn(tx: Prisma.TransactionClient, casoId: number) {
  return detalleDto(await tx.casoCalidadGerencial.findUniqueOrThrow({ where: { id: casoId }, include: includeCasoDetalle }));
}

async function auditarEvento(tx: Prisma.TransactionClient, usuarioId: number, casoId: number, accion: string, anteriores: Prisma.InputJsonValue, nuevos: Prisma.InputJsonValue) {
  await tx.auditoria.create({ data: { usuarioId, tipoActor: 'USUARIO', entidad: 'CasoCalidadGerencial', entidadId: String(casoId), accion, datosAnteriores: anteriores, datosNuevos: nuevos } });
}

export async function responderCaso(tx: Prisma.TransactionClient, id: number, input: ResponderCasoInput, actorId: number, ahora = new Date()) {
  const caso = await tx.casoCalidadGerencial.findUnique({ where: { id }, select: { id: true, version: true, abiertaEn: true, respondidaEn: true, resueltaEn: true, cerradaEn: true } });
  if (!caso) throw new AppError(404, 'El caso de calidad no existe.');
  if (caso.version !== input.version) throw new AppError(409, 'El caso cambió. Actualiza los datos antes de responder.');
  if (caso.respondidaEn !== null || caso.resueltaEn !== null || caso.cerradaEn !== null) throw new AppError(409, 'El caso ya tiene una respuesta o avanzó a otra etapa.');
  const respondidaEn = new Date(input.respondidaEn);
  if (respondidaEn < caso.abiertaEn || respondidaEn > ahora) throw new AppError(400, 'La respuesta debe ocurrir desde la apertura y hasta ahora.');
  const changed = await tx.casoCalidadGerencial.updateMany({ where: { id, version: input.version, respondidaEn: null, resueltaEn: null, cerradaEn: null }, data: { respondidaEn, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El caso cambió durante la respuesta.');
  await auditarEvento(tx, actorId, id, 'RESPONDER', { respondidaEn: null, version: caso.version }, { respondidaEn: respondidaEn.toISOString(), version: caso.version + 1 });
  return detalleEn(tx, id);
}

export async function resolverCaso(tx: Prisma.TransactionClient, id: number, input: ResolverCasoInput, actorId: number, ahora = new Date()) {
  const caso = await tx.casoCalidadGerencial.findUnique({ where: { id }, select: { id: true, version: true, respondidaEn: true, resueltaEn: true, cerradaEn: true, resultado: true, causaRaiz: true } });
  if (!caso) throw new AppError(404, 'El caso de calidad no existe.');
  if (caso.version !== input.version) throw new AppError(409, 'El caso cambió. Actualiza los datos antes de resolverlo.');
  if (caso.respondidaEn === null) throw new AppError(409, 'El caso debe responderse antes de resolverlo.');
  if (caso.resueltaEn !== null || caso.cerradaEn !== null) throw new AppError(409, 'El caso ya está resuelto o cerrado.');
  const resueltaEn = new Date(input.resueltaEn);
  if (resueltaEn < caso.respondidaEn || resueltaEn > ahora) throw new AppError(400, 'La resolución debe ocurrir desde la respuesta y hasta ahora.');
  const changed = await tx.casoCalidadGerencial.updateMany({ where: { id, version: input.version, respondidaEn: { not: null }, resueltaEn: null, cerradaEn: null }, data: { resueltaEn, resultado: input.resultado, causaRaiz: input.causaRaiz, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El caso cambió durante la resolución.');
  await auditarEvento(tx, actorId, id, 'RESOLVER', { resueltaEn: null, resultado: caso.resultado, causaRaiz: caso.causaRaiz, version: caso.version }, { resueltaEn: resueltaEn.toISOString(), resultado: input.resultado, causaRaiz: input.causaRaiz, version: caso.version + 1 });
  return detalleEn(tx, id);
}

export async function cerrarCaso(tx: Prisma.TransactionClient, id: number, input: CerrarCasoInput, actorId: number, ahora = new Date()) {
  const caso = await tx.casoCalidadGerencial.findUnique({ where: { id }, select: { id: true, version: true, resueltaEn: true, cerradaEn: true } });
  if (!caso) throw new AppError(404, 'El caso de calidad no existe.');
  if (caso.version !== input.version) throw new AppError(409, 'El caso cambió. Actualiza los datos antes de cerrarlo.');
  if (caso.resueltaEn === null) throw new AppError(409, 'El caso debe resolverse antes de cerrarlo.');
  if (caso.cerradaEn !== null) throw new AppError(409, 'El caso ya está cerrado.');
  const cerradaEn = new Date(input.cerradaEn);
  if (cerradaEn < caso.resueltaEn || cerradaEn > ahora) throw new AppError(400, 'El cierre debe ocurrir después de la resolución y hasta ahora.');
  const [retrabajos, correctivas] = await Promise.all([
    tx.retrabajoGerencial.findMany({ where: { casoId: id }, select: { fechaEfectiva: true } }),
    tx.correctivaGerencial.findMany({ where: { casoId: id }, select: { creadaEn: true, cerradaEn: true } }),
  ]);
  if (correctivas.some(correctiva => correctiva.cerradaEn === null)) throw new AppError(409, 'Cierra todas las acciones correctivas antes de cerrar el caso.');
  const dependencias = [caso.resueltaEn, ...retrabajos.map(item => item.fechaEfectiva), ...correctivas.flatMap(item => [item.creadaEn, ...(item.cerradaEn ? [item.cerradaEn] : [])])];
  const ultimaDependencia = dependencias.reduce((max, value) => value > max ? value : max);
  if (cerradaEn < ultimaDependencia) throw new AppError(409, 'El cierre no puede ser anterior al último retrabajo o hito de una acción correctiva.');
  const changed = await tx.casoCalidadGerencial.updateMany({ where: { id, version: input.version, resueltaEn: { not: null }, cerradaEn: null }, data: { cerradaEn, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El caso cambió durante el cierre.');
  await auditarEvento(tx, actorId, id, 'CERRAR', { cerradaEn: null, version: caso.version }, { cerradaEn: cerradaEn.toISOString(), version: caso.version + 1 });
  return detalleEn(tx, id);
}

export async function crearRetrabajo(tx: Prisma.TransactionClient, casoId: number, input: CrearRetrabajoInput, actorId: number, ahora = new Date()) {
  const caso = await tx.casoCalidadGerencial.findUnique({ where: { id: casoId }, select: { id: true, referencia: true, clienteId: true, version: true, abiertaEn: true, cerradaEn: true } });
  if (!caso) throw new AppError(404, 'El caso de calidad no existe.');
  if (caso.cerradaEn !== null) throw new AppError(409, 'No se pueden agregar retrabajos a un caso cerrado.');
  if (caso.version >= 2_147_483_647) throw new AppError(409, 'El caso llegó a la versión máxima y no admite nuevos eventos.');
  const fechaEfectiva = new Date(input.fechaEfectiva);
  if (fechaEfectiva < caso.abiertaEn || fechaEfectiva > ahora) throw new AppError(400, 'El retrabajo debe ocurrir desde la apertura y hasta ahora.');
  if (input.ordenId !== undefined) await verificarReferenciasCliente(tx, { clienteId: caso.clienteId, ordenId: input.ordenId });
  const changed = await tx.casoCalidadGerencial.updateMany({ where: { id: casoId, version: caso.version, cerradaEn: null }, data: { version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El caso cambió o se cerró durante la operación.');
  const row = await tx.retrabajoGerencial.create({ data: { casoId, referenciaTrabajo: input.referenciaTrabajo, fechaEfectiva, motivo: input.motivo, ordenId: input.ordenId ?? null, autorId: actorId } });
  await auditarEvento(tx, actorId, casoId, 'REGISTRAR_RETRABAJO', { version: caso.version }, { id: row.id, referenciaTrabajo: row.referenciaTrabajo, fechaEfectiva: fechaEfectiva.toISOString(), motivo: row.motivo, ordenId: row.ordenId, version: caso.version + 1 });
  return { id: row.id, casoId: row.casoId, referenciaTrabajo: row.referenciaTrabajo, fechaEfectiva: row.fechaEfectiva.toISOString(), motivo: row.motivo, ordenId: row.ordenId, registradoEn: row.registradoEn.toISOString() };
}

export async function crearCorrectiva(tx: Prisma.TransactionClient, casoId: number, input: CrearCorrectivaInput, actorId: number, ahora = new Date()) {
  const caso = await tx.casoCalidadGerencial.findUnique({ where: { id: casoId }, select: { id: true, referencia: true, version: true, abiertaEn: true, cerradaEn: true } });
  if (!caso) throw new AppError(404, 'El caso de calidad no existe.');
  if (caso.cerradaEn !== null) throw new AppError(409, 'No se pueden agregar acciones correctivas a un caso cerrado.');
  if (caso.version >= 2_147_483_647) throw new AppError(409, 'El caso llegó a la versión máxima y no admite nuevos eventos.');
  const creadaEn = new Date(input.creadaEn), venceEn = new Date(input.venceEn);
  if (creadaEn < caso.abiertaEn || creadaEn > ahora) throw new AppError(400, 'La acción correctiva debe crearse desde la apertura y hasta ahora.');
  if (venceEn < creadaEn) throw new AppError(400, 'La fecha límite debe ser igual o posterior a la creación.');
  const responsable = await tx.empleado.findUnique({ where: { id: input.responsableId }, select: { id: true, active: true } });
  if (!responsable) throw new AppError(404, 'El empleado responsable no existe.');
  if (!responsable.active) throw new AppError(400, 'El empleado responsable está inactivo.');
  const changed = await tx.casoCalidadGerencial.updateMany({ where: { id: casoId, version: caso.version, cerradaEn: null }, data: { version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'El caso cambió o se cerró durante la operación.');
  const row = await tx.correctivaGerencial.create({ data: { casoId, descripcion: input.descripcion, responsableId: input.responsableId, creadaEn, venceEn, autorId: actorId }, include: { responsable: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } } });
  await auditarEvento(tx, actorId, casoId, 'REGISTRAR_CORRECTIVA', { version: caso.version }, { id: row.id, descripcion: row.descripcion, responsableId: row.responsableId, creadaEn: creadaEn.toISOString(), venceEn: venceEn.toISOString(), version: caso.version + 1 });
  return { id: row.id, casoId: row.casoId, casoReferencia: caso.referencia, descripcion: row.descripcion, responsableId: row.responsableId, responsableNombre: nombreEmpleado(row.responsable), creadaEn: row.creadaEn.toISOString(), venceEn: row.venceEn.toISOString(), cerradaEn: null, resultado: null, version: row.version };
}

export async function cerrarCorrectiva(tx: Prisma.TransactionClient, id: number, input: { version: number; cerradaEn: string; resultado: string }, actorId: number, ahora = new Date()) {
  const row = await tx.correctivaGerencial.findUnique({ where: { id }, include: { caso: { select: { referencia: true } } } });
  if (!row) throw new AppError(404, 'La acción correctiva no existe.');
  if (row.version !== input.version) throw new AppError(409, 'La acción correctiva cambió. Actualiza los datos antes de cerrarla.');
  if (row.cerradaEn !== null) throw new AppError(409, 'La acción correctiva ya está cerrada.');
  const cerradaEn = new Date(input.cerradaEn);
  if (cerradaEn < row.creadaEn || cerradaEn > ahora) throw new AppError(400, 'El cierre debe ocurrir desde la creación y hasta ahora.');
  const changed = await tx.correctivaGerencial.updateMany({ where: { id, version: input.version, cerradaEn: null }, data: { cerradaEn, resultado: input.resultado, version: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, 'La acción correctiva cambió durante el cierre.');
  await tx.auditoria.create({ data: { usuarioId: actorId, tipoActor: 'USUARIO', entidad: 'CorrectivaGerencial', entidadId: String(id), accion: 'CERRAR', datosAnteriores: { cerradaEn: null, resultado: row.resultado, version: row.version }, datosNuevos: { cerradaEn: cerradaEn.toISOString(), resultado: input.resultado, version: row.version + 1 } } });
  const actualizada = await tx.correctivaGerencial.findUniqueOrThrow({ where: { id }, include: { responsable: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } } });
  return { id: actualizada.id, casoId: actualizada.casoId, casoReferencia: row.caso.referencia, descripcion: actualizada.descripcion, responsableId: actualizada.responsableId, responsableNombre: nombreEmpleado(actualizada.responsable), creadaEn: actualizada.creadaEn.toISOString(), venceEn: actualizada.venceEn.toISOString(), cerradaEn: actualizada.cerradaEn!.toISOString(), resultado: actualizada.resultado, version: actualizada.version };
}

export function conflictoCaso(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'Ya existe un caso con esa referencia.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente, garantía, equipo, orden o usuario indicado ya no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza y vuelve a intentar.');
  throw error;
}
