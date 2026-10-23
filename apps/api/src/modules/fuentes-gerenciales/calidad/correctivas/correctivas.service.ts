import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import type { ListarCorrectivasInput } from './correctivas.schema.js';

const includeCorrectiva = {
  caso: { select: { id: true, referencia: true } },
  responsable: { select: { id: true, persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } },
} satisfies Prisma.CorrectivaGerencialInclude;
type Correctiva = Prisma.CorrectivaGerencialGetPayload<{ include: typeof includeCorrectiva }>;

function nombre(empleado: Correctiva['responsable']) {
  return [empleado.persona.firstName, empleado.persona.secondName, empleado.persona.firstLastName, empleado.persona.secondLastName].filter(Boolean).join(' ');
}

function dto(row: Correctiva) {
  return {
    id: row.id, casoId: row.casoId, casoReferencia: row.caso.referencia, descripcion: row.descripcion,
    responsableId: row.responsableId, responsableNombre: nombre(row.responsable),
    creadaEn: row.creadaEn.toISOString(), venceEn: row.venceEn.toISOString(), cerradaEn: row.cerradaEn?.toISOString() ?? null,
    resultado: row.resultado, version: row.version,
  };
}

export async function listarCorrectivas(filtros: ListarCorrectivasInput) {
  const where: Prisma.CorrectivaGerencialWhereInput = {
    ...(filtros.casoId !== undefined ? { casoId: filtros.casoId } : {}),
    ...(filtros.responsable !== undefined ? { responsableId: filtros.responsable } : {}),
    ...(filtros.estado === 'abiertas' ? { cerradaEn: null } : filtros.estado === 'cerradas' ? { cerradaEn: { not: null } } : {}),
    ...(filtros.q ? { OR: [
      { descripcion: { contains: filtros.q, mode: 'insensitive' } },
      { caso: { referencia: { contains: filtros.q, mode: 'insensitive' } } },
    ] } : {}),
  };
  const rows = await prisma.correctivaGerencial.findMany({ where, include: includeCorrectiva, orderBy: [{ venceEn: 'asc' }, { id: 'asc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1 });
  const hayMas = rows.length > filtros.limite;
  return { items: rows.slice(0, filtros.limite).map(dto), pagina: filtros.pagina, limite: filtros.limite, hayMas };
}

export async function obtenerCorrectiva(id: number) {
  const row = await prisma.correctivaGerencial.findUnique({ where: { id }, include: includeCorrectiva });
  if (!row) throw new AppError(404, 'La acción correctiva no existe.');
  return dto(row);
}

export function conflictoCorrectiva(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new AppError(400, 'El caso o responsable indicado ya no existe.');
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza y vuelve a intentar.');
  throw error;
}
