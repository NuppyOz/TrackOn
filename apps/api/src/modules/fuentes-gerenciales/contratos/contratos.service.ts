import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import type { CrearContratoGerencial, ListarContratosGerenciales, RenovarContratoGerencial, TerminarContratoGerencial } from '../contracts/gerenciales.types.js';
import type { Prisma as PrismaTypes } from '@prisma/client';

const money = (value: unknown) => {
  const raw = String(value);
  const [whole, fraction = ''] = raw.split('.');
  if (fraction.length > 2) throw new AppError(400, 'El importe admite hasta dos decimales.');
  return `${whole}.${(fraction + '00').slice(0, 2)}`;
};
const include = { cliente: { include: { persona: true, organizacion: true } }, siguiente: { select: { id: true } } } satisfies Prisma.ContratoGerencialInclude;
type ContratoDetalle = PrismaTypes.ContratoGerencialGetPayload<{ include: typeof include }>;
const dto = (row: ContratoDetalle) => {
  const persona = row.cliente.persona;
  const clienteNombre = row.cliente.organizacion?.nombreComercial ?? row.cliente.organizacion?.razonSocial ?? (persona ? [persona.firstName, persona.secondName, persona.firstLastName, persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${row.clienteId}`);
  return { id: row.id, clienteId: row.clienteId, clienteNombre, referencia: row.referencia, inicio: row.inicio.toISOString(), fin: row.fin.toISOString(), importe: money(row.importe), anteriorId: row.anteriorId, siguienteId: row.siguiente?.id ?? null, terminadoEn: row.terminadoEn?.toISOString() ?? null, registradoEn: row.registradoEn.toISOString(), observacion: row.observacion, version: row.version };
};

export async function listar(filtros: ListarContratosGerenciales) {
  const qid = filtros.q && /^[1-9]\d*$/.test(filtros.q) && Number(filtros.q) <= 2_147_483_647 ? Number(filtros.q) : undefined;
  const buscarCliente: Prisma.ContratoGerencialWhereInput[] = filtros.q ? [
    {
      cliente: {
        is: {
          organizacion: {
            is: { OR: [
              { razonSocial: { contains: filtros.q, mode: 'insensitive' } },
              { nombreComercial: { contains: filtros.q, mode: 'insensitive' } },
            ] },
          },
        },
      },
    },
    {
      cliente: {
        is: {
          persona: {
            is: { OR: [
              { firstName: { contains: filtros.q, mode: 'insensitive' } },
              { secondName: { contains: filtros.q, mode: 'insensitive' } },
              { firstLastName: { contains: filtros.q, mode: 'insensitive' } },
              { secondLastName: { contains: filtros.q, mode: 'insensitive' } },
            ] },
          },
        },
      },
    },
  ] : [];
  const where: Prisma.ContratoGerencialWhereInput = {
    ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
    ...(filtros.q ? { OR: [
      { referencia: { contains: filtros.q, mode: 'insensitive' } },
      ...(qid ? [{ id: qid }, { clienteId: qid }] : []),
      ...buscarCliente,
    ] } : {}),
  };
  const rows = await prisma.contratoGerencial.findMany({ where, include, orderBy: [{ registradoEn: 'desc' }, { id: 'desc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 });
  const hayMas = rows.length > filtros.limite;
  return { items: rows.slice(0, filtros.limite).map(dto), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtener(id: number) {
  const row = await prisma.contratoGerencial.findUnique({ where: { id }, include });
  if (!row) throw new AppError(404, 'El contrato no existe.');
  return dto(row);
}

export async function crear(body: CrearContratoGerencial, autorId: number, tx: Prisma.TransactionClient) {
  const inicio = new Date(body.inicio), fin = new Date(body.fin);
  if (inicio >= fin) throw new AppError(400, 'El inicio debe ser anterior al fin.');
  const cliente = await tx.cliente.findUnique({ where: { id: body.clienteId }, select: { id: true, activo: true } });
  if (!cliente) throw new AppError(404, 'El cliente no existe.');
  if (!cliente.activo) throw new AppError(400, 'El cliente está inactivo.');
  const row = await tx.contratoGerencial.create({ data: { clienteId: body.clienteId, referencia: body.referencia, inicio, fin, importe: money(body.importe), autorId, observacion: body.observacion ?? null }, include });
  return dto(row);
}

export async function terminar(id: number, body: TerminarContratoGerencial, actorId: number, tx: Prisma.TransactionClient, ahora = new Date()) {
  const fecha = new Date(body.terminadoEn);
    const row = await tx.contratoGerencial.findUnique({ where: { id }, include });
    if (!row) throw new AppError(404, 'El contrato no existe.');
    if (row.version !== body.version) throw new AppError(409, 'El contrato cambió. Actualiza los datos antes de terminarlo.');
    if (row.terminadoEn || row.siguiente) throw new AppError(409, 'Un contrato terminado o renovado no puede terminarse.');
    if (fecha < row.inicio || fecha > row.fin || fecha > ahora) throw new AppError(400, 'La fecha de terminación debe estar entre el inicio, el fin y ahora.');
    const changed = await tx.contratoGerencial.updateMany({ where: { id, version: body.version, terminadoEn: null, siguiente: { is: null } }, data: { terminadoEn: fecha, version: { increment: 1 } } });
    if (!changed.count) throw new AppError(409, 'El contrato cambió durante la operación.');
    await tx.auditoria.create({ data: { usuarioId: actorId, tipoActor: 'USUARIO', entidad: 'ContratoGerencial', entidadId: String(id), accion: 'TERMINAR', datosAnteriores: { terminadoEn: null, version: row.version }, datosNuevos: { terminadoEn: fecha.toISOString(), motivo: body.motivo, version: row.version + 1 } } });
    return dto(await tx.contratoGerencial.findUniqueOrThrow({ where: { id }, include }));
}

export async function renovar(id: number, body: RenovarContratoGerencial, actorId: number, tx: Prisma.TransactionClient) {
  const inicio = new Date(body.inicio), fin = new Date(body.fin);
  if (inicio >= fin) throw new AppError(400, 'El inicio debe ser anterior al fin.');
    const anterior = await tx.contratoGerencial.findUnique({ where: { id }, include });
    if (!anterior) throw new AppError(404, 'El contrato no existe.');
    if (anterior.version !== body.version) throw new AppError(409, 'El contrato cambió. Actualiza los datos antes de renovarlo.');
    if (anterior.terminadoEn) throw new AppError(409, 'Un contrato terminado no puede renovarse.');
    if (anterior.siguiente) throw new AppError(409, 'Este contrato ya tiene un sucesor.');
    if (inicio < anterior.fin) throw new AppError(400, 'El inicio del sucesor debe ser igual o posterior al fin del contrato anterior.');
    const changed = await tx.contratoGerencial.updateMany({ where: { id, version: body.version }, data: { version: { increment: 1 } } });
    if (!changed.count) throw new AppError(409, 'El contrato cambió durante la operación.');
    const sucesor = await tx.contratoGerencial.create({ data: { clienteId: anterior.clienteId, referencia: body.referencia, inicio, fin, importe: money(body.importe), anteriorId: id, autorId: actorId, observacion: body.observacion ?? null }, include });
    await tx.auditoria.create({ data: { usuarioId: actorId, tipoActor: 'USUARIO', entidad: 'ContratoGerencial', entidadId: String(id), accion: 'RENOVAR', datosAnteriores: { version: anterior.version, siguienteId: null }, datosNuevos: { version: anterior.version + 1, siguienteId: sucesor.id, sucesorReferencia: sucesor.referencia } } });
    return dto(sucesor);
}
export function conflictoContrato(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'La referencia ya está registrada o el contrato ya tiene sucesor.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El cliente o usuario indicado no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'El contrato cambió durante la operación.');
  throw error;
}
