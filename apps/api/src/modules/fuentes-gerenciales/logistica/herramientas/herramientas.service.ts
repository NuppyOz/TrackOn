import { Prisma } from '@prisma/client';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia, ejecutarIdempotente } from '../../../../infrastructure/idempotencia.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import type { CrearHerramienta, DevolverPrestamo, ListarHerramientas, PrestarHerramienta } from './herramientas.schema.js';

const includeDetalle = {
  prestamos: {
    orderBy: [{ prestadaEn: 'desc' as const }, { id: 'desc' as const }],
    include: { empleado: { select: { persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } } },
  },
} satisfies Prisma.HerramientaGerencialInclude;
type HerramientaDetalle = Prisma.HerramientaGerencialGetPayload<{ include: typeof includeDetalle }>;
type PrestamoDetalle = HerramientaDetalle['prestamos'][number];
const nombreEmpleado = (loan: PrestamoDetalle) => [loan.empleado.persona?.firstName, loan.empleado.persona?.secondName, loan.empleado.persona?.firstLastName, loan.empleado.persona?.secondLastName].filter(Boolean).join(' ');
function prestamoDto(loan: PrestamoDetalle) {
  return { id: loan.id, herramientaId: loan.herramientaId, empleadoId: loan.empleadoId, empleadoNombre: nombreEmpleado(loan), prestadaEn: loan.prestadaEn.toISOString(), previstaEn: loan.previstaEn.toISOString(), devueltaEn: loan.devueltaEn?.toISOString() ?? null, referencia: loan.referencia, observacion: loan.observacion };
}
function detalleDto(row: HerramientaDetalle) {
  const abierto = row.prestamos.some(loan => loan.devueltaEn === null);
  return { id: row.id, codigo: row.codigo, nombre: row.nombre, creadaEn: row.creadaEn.toISOString(), estado: abierto ? 'PRESTADA' as const : 'DISPONIBLE' as const, prestamos: row.prestamos.map(prestamoDto) };
}
async function detalle(id: number, tx: Prisma.TransactionClient) {
  const row = await tx.herramientaGerencial.findUnique({ where: { id }, include: includeDetalle });
  if (!row) throw new AppError(404, 'La herramienta no existe.');
  return detalleDto(row);
}
function actor(id: number) { return { tipo: 'USUARIO' as const, id }; }

export async function listar(filtros: ListarHerramientas) {
  const q = filtros.q?.trim();
  const rows = await prisma.herramientaGerencial.findMany({
    where: q ? { OR: [{ codigo: { contains: q, mode: 'insensitive' } }, { nombre: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: [{ codigo: 'asc' }, { id: 'asc' }], skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1,
    include: { prestamos: { where: { devueltaEn: null }, select: { id: true } } },
  });
  return { items: rows.slice(0, filtros.limite).map(row => ({ id: row.id, codigo: row.codigo, nombre: row.nombre, creadaEn: row.creadaEn.toISOString(), estado: row.prestamos.length ? 'PRESTADA' as const : 'DISPONIBLE' as const })), pagina: filtros.pagina, limite: filtros.limite, hayMas: rows.length > filtros.limite };
}
export async function obtener(id: number) {
  const row = await prisma.herramientaGerencial.findUnique({ where: { id }, include: includeDetalle });
  if (!row) throw new AppError(404, 'La herramienta no existe.');
  return detalleDto(row);
}

export async function crear(datos: CrearHerramienta, autorId: number, key: string) {
  try {
    return await ejecutarIdempotente(actor(autorId), 'fuentes.logistica.herramientas.crear', claveIdempotencia(key), datos, async tx => {
      const row = await tx.herramientaGerencial.create({ data: { codigo: datos.codigo, nombre: datos.nombre, autorId }, select: { id: true } });
      return detalle(row.id, tx);
    });
  } catch (error) { conflictoHerramienta(error); }
}
export async function prestar(id: number, datos: PrestarHerramienta, autorId: number, key: string) {
  try {
    return await ejecutarIdempotente(actor(autorId), 'fuentes.logistica.herramientas.prestar', claveIdempotencia(key), { id, ...datos }, async tx => {
      const herramienta = await tx.herramientaGerencial.findUnique({ where: { id }, select: { id: true } });
      if (!herramienta) throw new AppError(404, 'La herramienta no existe.');
      const empleado = await tx.empleado.findUnique({ where: { id: datos.empleadoId }, select: { id: true, active: true } });
      if (!empleado) throw new AppError(404, 'El empleado no existe.');
      if (!empleado.active) throw new AppError(409, 'El empleado no está activo.');
      const fecha = new Date(datos.prestadaEn);
      const ahora = new Date();
      if (fecha.getTime() > ahora.getTime()) throw new AppError(400, 'La fecha del préstamo no puede estar en el futuro.');
      const ultimo = await tx.prestamoHerramientaGerencial.findFirst({ where: { herramientaId: id, devueltaEn: { not: null } }, orderBy: [{ devueltaEn: 'desc' }, { id: 'desc' }], select: { devueltaEn: true } });
      if (ultimo?.devueltaEn && fecha.getTime() < ultimo.devueltaEn.getTime()) throw new AppError(409, 'El préstamo no puede ser anterior a la última devolución.');
      const abierto = await tx.prestamoHerramientaGerencial.findFirst({ where: { herramientaId: id, devueltaEn: null }, select: { id: true } });
      if (abierto) throw new AppError(409, 'La herramienta ya está prestada.');
      await tx.prestamoHerramientaGerencial.create({ data: { herramientaId: id, empleadoId: datos.empleadoId, referencia: datos.referencia, prestadaEn: fecha, previstaEn: new Date(datos.previstaEn), observacion: datos.observacion ?? null, autorId } });
      return detalle(id, tx);
    });
  } catch (error) { conflictoHerramienta(error); }
}
export async function devolver(id: number, datos: DevolverPrestamo, autorId: number, key: string) {
  try {
    return await ejecutarIdempotente(actor(autorId), 'fuentes.logistica.herramientas.devolver', claveIdempotencia(key), { id, ...datos }, async tx => {
      const loan = await tx.prestamoHerramientaGerencial.findUnique({ where: { id }, select: { id: true, herramientaId: true, prestadaEn: true, devueltaEn: true, referencia: true, observacion: true } });
      if (!loan) throw new AppError(404, 'El préstamo no existe.');
      if (loan.devueltaEn) throw new AppError(409, 'El préstamo ya fue devuelto.');
      const fecha = new Date(datos.devueltaEn);
      if (fecha.getTime() > Date.now()) throw new AppError(400, 'La fecha de devolución no puede estar en el futuro.');
      if (fecha.getTime() < loan.prestadaEn.getTime()) throw new AppError(400, 'La devolución no puede ser anterior al préstamo.');
      const changed = await tx.prestamoHerramientaGerencial.updateMany({ where: { id, devueltaEn: null }, data: { devueltaEn: fecha, devueltaPorId: autorId } });
      if (!changed.count) throw new AppError(409, 'El préstamo ya fue devuelto.');
      await tx.auditoria.create({ data: {
        usuarioId: autorId, tipoActor: 'USUARIO', entidad: 'PrestamoHerramientaGerencial', entidadId: String(id), accion: 'DEVOLVER',
        datosAnteriores: { devueltaEn: null }, datosNuevos: { devueltaEn: fecha.toISOString(), observacion: datos.observacion ?? null, referencia: loan.referencia },
      } });
      return detalle(loan.herramientaId, tx);
    });
  } catch (error) { conflictoHerramienta(error); }
}

export function conflictoHerramienta(error: unknown): never {
  if (error instanceof AppError) throw error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new AppError(409, 'El código, referencia o préstamo abierto ya está registrado.');
    if (error.code === 'P2003') throw new AppError(404, 'El empleado, herramienta o autor asociado no existe.');
    if (error.code === 'P2025') throw new AppError(404, 'El registro solicitado no existe.');
    if (error.code === 'P2034') throw new AppError(409, 'Los datos cambiaron durante la operación. Actualiza e inténtalo de nuevo.');
  }
  throw error;
}
