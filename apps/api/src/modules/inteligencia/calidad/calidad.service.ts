import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import { calcularIndicadoresCalidad } from './calidad.calculo.js';

type Rango = { desde: string; hasta: string };
const clienteSelect = {
  id: true,
  persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } },
  organizacion: { select: { razonSocial: true, nombreComercial: true } },
} satisfies Prisma.ClienteSelect;
const responsableSelect = { persona: { select: { firstName: true, secondName: true, firstLastName: true, secondLastName: true } } } satisfies Prisma.EmpleadoSelect;

export async function obtenerTablero(rango: Rango, reloj: () => Date = () => new Date()) {
  const desde = new Date(rango.desde), hasta = new Date(rango.hasta), ahora = reloj();
  if (!Number.isFinite(desde.getTime()) || !Number.isFinite(hasta.getTime()) || !Number.isFinite(ahora.getTime())) throw new AppError(400, 'Las fechas del rango deben ser válidas.');
  if (desde >= hasta || hasta.getTime() - desde.getTime() > 366 * 86_400_000) throw new AppError(400, 'El rango debe ser creciente y no superar 366 días.');
  const corte = hasta < ahora ? hasta : ahora;
  const snapshot = await prisma.$transaction(async tx => {
    const [garantias, casos, retrabajos, correctivas, cobertura, countGarantias, countCasos, countRetrabajos, countCorrectivas] = await Promise.all([
      tx.garantiaGerencial.findMany({ where: { inicio: { lt: corte } }, select: { id: true, referencia: true, clienteId: true, cliente: { select: clienteSelect }, activoReferencia: true, inicio: true, fin: true }, orderBy: [{ inicio: 'desc' }, { id: 'desc' }] }),
      tx.casoCalidadGerencial.findMany({ where: { abiertaEn: { lt: corte } }, select: { id: true, referencia: true, clienteId: true, cliente: { select: clienteSelect }, activoReferencia: true, codigoFalla: true, abiertaEn: true, anteriorId: true, respondidaEn: true, resueltaEn: true, cerradaEn: true, respuestaLimiteEn: true, resolucionLimiteEn: true }, orderBy: [{ abiertaEn: 'desc' }, { id: 'desc' }] }),
      tx.retrabajoGerencial.findMany({ where: { fechaEfectiva: { gte: desde, lt: corte } }, select: { id: true, casoId: true, referenciaTrabajo: true, fechaEfectiva: true, ordenId: true, caso: { select: { referencia: true } } }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }] }),
      tx.correctivaGerencial.findMany({ where: { creadaEn: { lt: corte } }, select: { id: true, casoId: true, descripcion: true, responsableId: true, responsable: { select: responsableSelect }, creadaEn: true, venceEn: true, cerradaEn: true, caso: { select: { referencia: true } } }, orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }] }),
      tx.coberturaGerencial.findUnique({ where: { area: 'CALIDAD' }, select: { desde: true, hastaVerificada: true, observacion: true } }),
      tx.garantiaGerencial.count(), tx.casoCalidadGerencial.count(), tx.retrabajoGerencial.count(), tx.correctivaGerencial.count(),
    ]);
    return { garantias, casos, retrabajos, correctivas, cobertura, hayFuente: countGarantias + countCasos + countRetrabajos + countCorrectivas > 0 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return calcularIndicadoresCalidad({ desde, hasta, ahora, ...snapshot });
}
