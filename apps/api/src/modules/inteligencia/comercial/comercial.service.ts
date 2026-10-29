import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';

type Rango = { desde: string; hasta: string };
type Tasa = { clave: string; valor: string | null; unidad: 'porcentaje'; estado: 'CALCULADO' | 'SIN_BASE_DE_CALCULO'; fuentes: string[]; motivo: string | null; base: { numerador: number; denominador: number } };
const moneyMinor = (value: Prisma.Decimal | string | number): bigint => {
  const raw = String(value);
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(raw)) throw new Error('Se encontró un importe comercial inválido.');
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole!) * 100n + BigInt((fraction + '00').slice(0, 2));
};
const fixedMinor = (minor: bigint) => `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
const fixedPercent = (numerator: bigint, denominator: bigint) => {
  if (denominator === 0n) return null;
  const scaledNumerator = numerator * 10_000n;
  const rounded = (scaledNumerator + denominator / 2n) / denominator;
  return `${rounded / 100n}.${(rounded % 100n).toString().padStart(2, '0')}`;
};
const rate = (clave: string, numerador: number, denominador: number, motivo: string, fuentes: string[]): Tasa => ({
  clave, valor: fixedPercent(BigInt(numerador), BigInt(denominador)), unidad: 'porcentaje',
  estado: denominador ? 'CALCULADO' : 'SIN_BASE_DE_CALCULO', fuentes,
  motivo: denominador ? null : motivo, base: { numerador, denominador },
});
const iso = (value: Date) => value.toISOString();
const nullableIso = (value: Date | null) => value === null ? null : value.toISOString();

type QuoteSource = { id: number; clienteId: number; total: Prisma.Decimal | string | number; estado: string; venceEn: Date; creadaEn: Date };
type SaleSource = { id: number; clienteId: number; total: Prisma.Decimal | string | number; confirmadaEn: Date };
type ContractSource = { id: number; clienteId: number; referencia: string; inicio: Date; fin: Date; importe: Prisma.Decimal | string | number; terminadoEn: Date | null; anteriorId: number | null };
export type ComercialSnapshot = {
  desde: Date; hasta: Date; ahora: Date;
  quotes: QuoteSource[]; sales: SaleSource[]; contracts: ContractSource[];
  contratosActivos: number | null; renovaciones: number; padresVencen: { successorStart: Date | null }[];
  cohorteEnviada: { estado: string }[]; coverage: { desde: Date; hastaVerificada: Date; observacion: string | null } | null;
  hayFuente: boolean;
};

export function calcularIndicadoresComerciales(snapshot: ComercialSnapshot) {
  const { desde, hasta, ahora } = snapshot;
  const corte = hasta < ahora ? hasta : ahora;
  const sinBaseFutura = desde >= corte;
  const quotes = sinBaseFutura ? [] : snapshot.quotes.filter(q => q.creadaEn >= desde && q.creadaEn < corte);
  const sales = sinBaseFutura ? [] : snapshot.sales.filter(s => s.confirmadaEn >= desde && s.confirmadaEn < corte);
  const contracts = sinBaseFutura ? [] : snapshot.contracts.filter(c => (c.inicio >= desde && c.inicio < corte) || (c.inicio < corte && c.fin >= corte && (c.terminadoEn === null || c.terminadoEn >= corte)) || (c.fin >= desde && c.fin < corte));
  const cohort = sinBaseFutura ? [] : snapshot.cohorteEnviada;
  const convertidas = cohort.filter(q => q.estado === 'APROBADA').length;
  const renewalsBase = sinBaseFutura ? 0 : snapshot.padresVencen.length;
  const renewalsWithSuccessor = sinBaseFutura ? 0 : snapshot.padresVencen.filter(p => p.successorStart !== null && p.successorStart < corte).length;
  const ventasTotal = sales.reduce((sum, sale) => sum + moneyMinor(sale.total), 0n);
  const clientes = new Set(sales.map(sale => sale.clienteId)).size;
  const cotizacionesRows = quotes.map(q => {
    const estado = q.estado === 'ENVIADA' && q.venceEn.getTime() <= ahora.getTime() ? 'VENCIDA' : q.estado;
    return { tipo: 'COTIZACION' as const, id: q.id, clienteId: q.clienteId, referencia: `COT-${q.id}`, fecha: iso(q.creadaEn), total: fixedMinor(moneyMinor(q.total)), estado };
  });
  const ventasRows = sales.map(v => ({ tipo: 'VENTA' as const, id: v.id, clienteId: v.clienteId, referencia: `VENTA-${v.id}`, fecha: iso(v.confirmadaEn), total: fixedMinor(moneyMinor(v.total)), estado: 'CONFIRMADA' }));
  const contratosRows = contracts.map(c => ({ tipo: 'CONTRATO' as const, id: c.id, clienteId: c.clienteId, referencia: c.referencia, fecha: iso(c.inicio), total: fixedMinor(moneyMinor(c.importe)), estado: c.terminadoEn && c.terminadoEn < corte ? 'TERMINADO' : c.fin < corte ? 'VENCIDO' : 'VIGENTE' }));
  const coberturaCompleta = snapshot.coverage !== null && snapshot.coverage.desde <= desde && snapshot.coverage.hastaVerificada >= corte;
  const estadoCobertura = !snapshot.hayFuente ? 'SIN_REGISTROS' : coberturaCompleta ? 'COMPLETA' : 'PARCIAL';
  const observaciones = [snapshot.coverage?.observacion, ...(coberturaCompleta || !snapshot.hayFuente ? [] : ['La cobertura comercial no está verificada para todo el rango consultado.']), ...(hasta > ahora ? [`El rango solicitado llega hasta ${iso(hasta)}; se evaluó hasta ${iso(corte)}.`] : []), ...(sinBaseFutura ? ['El rango comienza después del corte de evaluación; no hay base futura para los indicadores de período.'] : [])].filter((value): value is string => Boolean(value));
  const metricas = [
    { clave: 'cotizaciones_total', valor: quotes.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['cotizaciones_comerciales'], motivo: null },
    rate('conversion_porcentaje', convertidas, cohort.length, 'No hay cotizaciones enviadas en el período de evaluación.', ['cotizaciones_comerciales']),
    { clave: 'ventas_cantidad', valor: sales.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['ventas_comerciales'], motivo: null },
    { clave: 'ventas_importe', valor: fixedMinor(ventasTotal), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['ventas_comerciales'], motivo: null },
    { clave: 'clientes_con_ventas', valor: clientes, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['ventas_comerciales'], motivo: null },
    { clave: 'ticket_promedio', valor: sales.length ? fixedMinor((ventasTotal + BigInt(sales.length) / 2n) / BigInt(sales.length)) : null, unidad: 'NIO' as const, estado: sales.length ? 'CALCULADO' as const : 'SIN_BASE_DE_CALCULO' as const, fuentes: ['ventas_comerciales'], motivo: sales.length ? null : 'No hay ventas confirmadas en el período.' },
    { clave: 'contratos_activos', valor: sinBaseFutura ? null : snapshot.contratosActivos, unidad: 'cantidad' as const, estado: sinBaseFutura || snapshot.contratosActivos === null ? 'SIN_BASE_DE_CALCULO' as const : 'CALCULADO' as const, fuentes: ['contratos_gerenciales'], motivo: sinBaseFutura ? 'El rango comienza después del corte de evaluación.' : snapshot.contratosActivos === null ? 'No hay una base de contratos en el corte.' : null },
    { clave: 'renovaciones_cantidad', valor: sinBaseFutura ? 0 : snapshot.renovaciones, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['contratos_gerenciales'], motivo: null },
    rate('renovacion_porcentaje', renewalsWithSuccessor, renewalsBase, 'No hay contratos con vencimiento en el período.', ['contratos_gerenciales']),
  ];
  const desgloses = [...cotizacionesRows, ...ventasRows, ...contratosRows].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  return { desde: iso(desde), hasta: iso(hasta), corteEvaluacion: iso(corte), zonaHoraria: 'America/Managua' as const,
    cobertura: { estado: estadoCobertura, desde: nullableIso(snapshot.coverage?.desde ?? null), hastaVerificada: nullableIso(snapshot.coverage?.hastaVerificada ?? null), observaciones },
    metricas, desgloses, registrosSinAsignar: 0 };
}

export async function obtenerTablero(rango: Rango, reloj: () => Date = () => new Date()) {
  const desde = new Date(rango.desde), solicitadoHasta = new Date(rango.hasta), ahora = reloj();
  if (desde >= solicitadoHasta || solicitadoHasta.getTime() - desde.getTime() > 366 * 86_400_000) throw new AppError(400, 'El rango debe ser creciente y no superar 366 días.');
  const corte = solicitadoHasta < ahora ? solicitadoHasta : ahora;
  const snapshot = await prisma.$transaction(async tx => {
    const [quotes, sales, contracts, contratosActivos, renovaciones, padres, cohorteEnviada, coverage, anyQuote, anySale, anyContract] = await Promise.all([
      tx.cotizacionComercial.findMany({ where: { creadaEn: { gte: desde, lt: corte } }, select: { id: true, clienteId: true, total: true, estado: true, venceEn: true, creadaEn: true }, orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }] }),
      tx.ventaComercial.findMany({ where: { confirmadaEn: { gte: desde, lt: corte } }, select: { id: true, clienteId: true, total: true, confirmadaEn: true }, orderBy: [{ confirmadaEn: 'desc' }, { id: 'desc' }] }),
      tx.contratoGerencial.findMany({ where: { OR: [{ inicio: { gte: desde, lt: corte } }, { inicio: { lt: corte }, fin: { gte: corte }, OR: [{ terminadoEn: null }, { terminadoEn: { gte: corte } }] }, { fin: { gte: desde, lt: corte } }] }, select: { id: true, clienteId: true, referencia: true, inicio: true, fin: true, importe: true, terminadoEn: true, anteriorId: true }, orderBy: [{ inicio: 'desc' }, { id: 'desc' }] }),
      tx.contratoGerencial.count({ where: { inicio: { lt: corte }, fin: { gte: corte }, OR: [{ terminadoEn: null }, { terminadoEn: { gte: corte } }] } }),
      tx.contratoGerencial.count({ where: { anteriorId: { not: null }, inicio: { gte: desde, lt: corte } } }),
      tx.contratoGerencial.findMany({ where: { fin: { gte: desde, lt: corte } }, select: { id: true, siguiente: { select: { inicio: true } } } }),
      tx.cotizacionComercial.findMany({ where: { enviadaEn: { gte: desde, lt: corte } }, select: { estado: true } }),
      tx.coberturaGerencial.findUnique({ where: { area: 'COMERCIAL' }, select: { desde: true, hastaVerificada: true, observacion: true } }),
      tx.cotizacionComercial.count(), tx.ventaComercial.count(), tx.contratoGerencial.count(),
    ]);
    return { quotes, sales, contracts, contratosActivos, renovaciones, padres, cohorteEnviada, coverage, hayFuente: anyQuote + anySale + anyContract > 0 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return calcularIndicadoresComerciales({ desde, hasta: solicitadoHasta, ahora, ...snapshot,
    padresVencen: snapshot.padres.map(p => ({ successorStart: p.siguiente?.inicio ?? null })),
  });
}
