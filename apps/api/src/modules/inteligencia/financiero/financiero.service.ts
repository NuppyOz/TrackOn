import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError.js';
import { prisma } from '../../../infrastructure/prisma.js';
import { centavos, decimalFijo, milesimas, porcentaje } from '../../fuentes-gerenciales/contracts/precision.js';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';

type Rango = { desde: string; hasta: string };
type Cliente = { id: number; persona: { firstName: string | null; secondName: string | null; firstLastName: string | null; secondLastName: string | null } | null; organizacion: { nombreComercial: string | null; razonSocial: string | null } | null };
type Linea = { id: number; importe: Prisma.Decimal | string | number; ordenId: number | null; orden: { numero: bigint } | null };
type AplicacionCobro = { importe: Prisma.Decimal | string | number; cobro: { fechaEfectiva: Date; revertidoEn: Date | null } };
type Comprobante = { id: number; clienteId: number; cliente: Cliente; referencia: string; emitidaEn: Date; venceEn: Date; importeFinal: Prisma.Decimal | string | number; anuladaEn: Date | null; lineas: Linea[]; aplicaciones: AplicacionCobro[] };
type Cobro = { id: number; clienteId: number; cliente: Cliente; referencia: string; fechaEfectiva: Date; importe: Prisma.Decimal | string | number; revertidoEn: Date | null };
type Costo = { id: number; referencia: string; clienteId: number | null; cliente: Cliente | null; ordenId: number | null; orden: { numero: bigint } | null; comprobanteId: number | null; categoria: string; fechaEfectiva: Date; importe: Prisma.Decimal | string | number; revertidoEn: Date | null };
type Servicio = { id: number; referencia: string; clienteId: number; cliente: Cliente; conceptoId: number; concepto: { nombre: string }; unidad: string; fechaEfectiva: Date; cantidad: Prisma.Decimal | string | number; aplicaciones: { cantidad: Prisma.Decimal | string | number; fechaEfectiva: Date; lineaComprobante: { comprobante: { anuladaEn: Date | null } } }[] };
export type FinancieroSnapshot = {
  desde: Date; hasta: Date; ahora: Date; comprobantes: Comprobante[]; cobros: Cobro[]; costos: Costo[]; servicios: Servicio[];
  coverage: { desde: Date; hastaVerificada: Date; observacion: string | null } | null;
};

const nombreCliente = (c: Cliente) => c.organizacion?.nombreComercial ?? c.organizacion?.razonSocial ?? (c.persona ? [c.persona.firstName, c.persona.secondName, c.persona.firstLastName, c.persona.secondLastName].filter(Boolean).join(' ') : `Cliente ${c.id}`);
const iso = (d: Date) => d.toISOString();
const nullableIso = (d: Date | null) => d?.toISOString() ?? null;
const monto = (v: unknown) => centavos(String(v));
const maxCero = (v: bigint) => v < 0n ? 0n : v;
const enRango = (fecha: Date, desde: Date, corte: Date) => fecha >= desde && fecha < corte;
const formatear = (n: bigint) => decimalFijo(n, 2);

function netoOriginalYReversion(importe: bigint, original: Date, reverso: Date | null, desde: Date, corte: Date) {
  return (enRango(original, desde, corte) ? importe : 0n) - (reverso && enRango(reverso, desde, corte) ? importe : 0n);
}

export function calcularIndicadoresFinancieros(snapshot: FinancieroSnapshot) {
  const { desde, hasta, ahora } = snapshot;
  const corte = hasta < ahora ? hasta : ahora;
  const sinBaseFutura = desde >= corte;
  const comprobantes = snapshot.comprobantes.filter(x => x.emitidaEn < corte);
  const cobros = snapshot.cobros.filter(x => x.fechaEfectiva < corte);
  const costos = snapshot.costos.filter(x => x.fechaEfectiva < corte);
  const servicios = snapshot.servicios.filter(x => x.fechaEfectiva < corte);

  let facturacion = 0n;
  for (const c of comprobantes) facturacion += netoOriginalYReversion(monto(c.importeFinal), c.emitidaEn, c.anuladaEn, desde, corte);
  let totalCobros = 0n;
  for (const c of cobros) totalCobros += netoOriginalYReversion(monto(c.importe), c.fechaEfectiva, c.revertidoEn, desde, corte);
  let totalCostos = 0n;
  for (const c of costos) totalCostos += netoOriginalYReversion(monto(c.importe), c.fechaEfectiva, c.revertidoEn, desde, corte);

  let cuentasPorCobrar = 0n, cuentasVencidas = 0n;
  const comprobantesVigentesAlCorte = new Set<number>();
  for (const c of comprobantes) {
    if (c.anuladaEn !== null && c.anuladaEn < corte) continue;
    comprobantesVigentesAlCorte.add(c.id);
    const aplicado = c.aplicaciones.reduce((sum, a) => sum + (a.cobro.fechaEfectiva < corte && (a.cobro.revertidoEn === null || a.cobro.revertidoEn >= corte) ? monto(a.importe) : 0n), 0n);
    const saldo = maxCero(monto(c.importeFinal) - aplicado);
    cuentasPorCobrar += saldo;
    if (saldo > 0n && c.venceEn < corte) cuentasVencidas += saldo;
  }

  const comprobantesRows = comprobantes.map(c => {
    const saldo = comprobantesVigentesAlCorte.has(c.id)
      ? maxCero(monto(c.importeFinal) - c.aplicaciones.reduce((sum, a) => sum + (a.cobro.fechaEfectiva < corte && (a.cobro.revertidoEn === null || a.cobro.revertidoEn >= corte) ? monto(a.importe) : 0n), 0n))
      : 0n;
    return { tipo: 'COMPROBANTE' as const, id: c.id, referencia: c.referencia, clienteId: c.clienteId, clienteNombre: nombreCliente(c.cliente), fecha: iso(c.emitidaEn), venceEn: iso(c.venceEn), importe: formatear(monto(c.importeFinal)), saldo: formatear(saldo), anuladaEn: nullableIso(c.anuladaEn), netoPeriodo: formatear(netoOriginalYReversion(monto(c.importeFinal), c.emitidaEn, c.anuladaEn, desde, corte)) };
  });
  const cobrosRows = cobros.map(c => ({ tipo: 'COBRO' as const, id: c.id, referencia: c.referencia, clienteId: c.clienteId, clienteNombre: nombreCliente(c.cliente), fecha: iso(c.fechaEfectiva), importe: formatear(monto(c.importe)), revertidoEn: nullableIso(c.revertidoEn), netoPeriodo: formatear(netoOriginalYReversion(monto(c.importe), c.fechaEfectiva, c.revertidoEn, desde, corte)) }));
  const costosRows = costos.map(c => ({ tipo: 'COSTO' as const, id: c.id, referencia: c.referencia, clienteId: c.clienteId, clienteNombre: c.cliente ? nombreCliente(c.cliente) : null, ordenId: c.ordenId, comprobanteId: c.comprobanteId, categoria: c.categoria, fecha: iso(c.fechaEfectiva), importe: formatear(monto(c.importe)), revertidoEn: nullableIso(c.revertidoEn), netoPeriodo: formatear(netoOriginalYReversion(monto(c.importe), c.fechaEfectiva, c.revertidoEn, desde, corte)) }));

  const serviciosRows = servicios.flatMap(s => {
    const cantidad = milesimas(String(s.cantidad));
    const aplicado = s.aplicaciones.reduce((sum, a) => {
      const anulada = a.lineaComprobante.comprobante.anuladaEn;
      return sum + (a.fechaEfectiva < corte && (anulada === null || anulada >= corte) ? milesimas(String(a.cantidad)) : 0n);
    }, 0n);
    const pendiente = maxCero(cantidad - aplicado);
    return pendiente > 0n ? [{ tipo: 'FACTURABLE' as const, id: s.id, referencia: s.referencia, clienteId: s.clienteId, clienteNombre: nombreCliente(s.cliente), conceptoId: s.conceptoId, conceptoNombre: s.concepto.nombre, unidad: s.unidad, fecha: iso(s.fechaEfectiva), cantidad: decimalFijo(cantidad, 3), pendiente: decimalFijo(pendiente, 3) }] : [];
  });

  const rentabilidad = new Map<string, { agrupacion: 'CLIENTE' | 'ORDEN'; id: number; referencia: string; ingresos: bigint; costos: bigint }>();
  const agregarGrupo = (key: string, agrupacion: 'CLIENTE' | 'ORDEN', id: number, referencia: string) => {
    let row = rentabilidad.get(key);
    if (!row) { row = { agrupacion, id, referencia, ingresos: 0n, costos: 0n }; rentabilidad.set(key, row); }
    return row;
  };
  for (const c of comprobantes) {
    const contribucion = netoOriginalYReversion(monto(c.importeFinal), c.emitidaEn, c.anuladaEn, desde, corte);
    agregarGrupo(`C:${c.clienteId}`, 'CLIENTE', c.clienteId, nombreCliente(c.cliente)).ingresos += contribucion;
    for (const linea of c.lineas) {
      if (linea.ordenId === null) continue;
      const valor = netoOriginalYReversion(monto(linea.importe), c.emitidaEn, c.anuladaEn, desde, corte);
      const referencia = linea.orden ? `OT-${linea.orden.numero.toString()}` : `OT-${linea.ordenId}`;
      agregarGrupo(`O:${linea.ordenId}`, 'ORDEN', linea.ordenId, referencia).ingresos += valor;
    }
  }
  for (const c of costos) {
    const contribucion = netoOriginalYReversion(monto(c.importe), c.fechaEfectiva, c.revertidoEn, desde, corte);
    if (c.clienteId !== null && c.cliente !== null) agregarGrupo(`C:${c.clienteId}`, 'CLIENTE', c.clienteId, nombreCliente(c.cliente)).costos += contribucion;
    if (c.ordenId !== null) {
      const referencia = c.orden ? `OT-${c.orden.numero.toString()}` : `OT-${c.ordenId}`;
      agregarGrupo(`O:${c.ordenId}`, 'ORDEN', c.ordenId, referencia).costos += contribucion;
    }
  }
  const rentabilidadRows = [...rentabilidad.values()].map(r => {
    const resultado = r.ingresos - r.costos;
    return { tipo: 'RENTABILIDAD' as const, agrupacion: r.agrupacion, id: r.id, referencia: r.referencia, ingresos: formatear(r.ingresos), costos: formatear(r.costos), resultado: formatear(resultado), margen: r.ingresos > 0n ? porcentaje(resultado, r.ingresos) : null };
  });
  const desgloses = [...comprobantesRows, ...cobrosRows, ...costosRows, ...serviciosRows, ...rentabilidadRows].sort((a, b) => {
    const fechaA = 'fecha' in a ? a.fecha : '';
    const fechaB = 'fecha' in b ? b.fecha : '';
    return fechaB.localeCompare(fechaA) || b.id - a.id || a.tipo.localeCompare(b.tipo);
  });

  const resultado = facturacion - totalCostos;
  const margen = facturacion > 0n ? porcentaje(resultado, facturacion) : null;
  const hayFuente = comprobantes.length + cobros.length + costos.length + servicios.length > 0;
  const coberturaCompleta = snapshot.coverage !== null && snapshot.coverage.desde <= desde && snapshot.coverage.hastaVerificada >= corte && !sinBaseFutura;
  const estadoCobertura = !hayFuente ? 'SIN_REGISTROS' : coberturaCompleta ? 'COMPLETA' : 'PARCIAL';
  const observaciones = [
    snapshot.coverage?.observacion,
    ...(coberturaCompleta || !hayFuente ? [] : ['La cobertura financiera no está verificada para todo el rango consultado.']),
    ...(hasta > ahora ? [`El rango solicitado llega hasta ${iso(hasta)}; se evaluó hasta ${iso(corte)}.`] : []),
    ...(sinBaseFutura ? ['El rango comienza después del corte de evaluación; no hay base futura para los indicadores de período.'] : []),
  ].filter((value): value is string => Boolean(value));
  const metricas = [
    { clave: 'facturacion', valor: formatear(facturacion), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['comprobantes_gerenciales'], motivo: null },
    { clave: 'cobros', valor: formatear(totalCobros), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['cobros_gerenciales'], motivo: null },
    { clave: 'cuentas_por_cobrar', valor: formatear(cuentasPorCobrar), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['comprobantes_gerenciales', 'aplicaciones_cobros_gerenciales'], motivo: null },
    { clave: 'cuentas_vencidas', valor: formatear(cuentasVencidas), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['comprobantes_gerenciales', 'aplicaciones_cobros_gerenciales'], motivo: null },
    { clave: 'costos', valor: formatear(totalCostos), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['costos_gerenciales'], motivo: null },
    { clave: 'resultado_registrado', valor: formatear(resultado), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['comprobantes_gerenciales', 'costos_gerenciales'], motivo: null },
    { clave: 'margen_porcentaje', valor: margen, unidad: 'porcentaje' as const, estado: margen === null ? 'SIN_BASE_DE_CALCULO' as const : 'CALCULADO' as const, fuentes: ['comprobantes_gerenciales', 'costos_gerenciales'], motivo: margen === null ? 'La facturación neta del período es cero o negativa.' : null, base: { numerador: formatear(resultado), denominador: formatear(facturacion) } },
  ];
  const registrosSinAsignar = costos.filter(c => c.clienteId === null && c.ordenId === null && c.comprobanteId === null && (enRango(c.fechaEfectiva, desde, corte) || (c.revertidoEn !== null && enRango(c.revertidoEn, desde, corte)))).length;
  return { desde: iso(desde), hasta: iso(hasta), corteEvaluacion: iso(corte), zonaHoraria: 'America/Managua' as const, cobertura: { estado: estadoCobertura, desde: nullableIso(snapshot.coverage?.desde ?? null), hastaVerificada: nullableIso(snapshot.coverage?.hastaVerificada ?? null), observaciones }, metricas, desgloses, registrosSinAsignar };
}

export async function obtenerTablero(rango: Rango, reloj: () => Date = () => new Date()) {
  const validado = rangoQuerySchema.parse(rango);
  const desde = new Date(validado.desde), hasta = new Date(validado.hasta), ahora = reloj();
  if (desde >= hasta || hasta.getTime() - desde.getTime() > 366 * 86_400_000) throw new AppError(400, 'El rango debe ser creciente y no superar 366 días.');
  const corte = hasta < ahora ? hasta : ahora;
  const snapshot = await prisma.$transaction(async tx => {
    const [comprobantes, cobros, costos, servicios, coverage] = await Promise.all([
      tx.comprobanteGerencial.findMany({ where: { emitidaEn: { lt: corte } }, include: { cliente: { include: { persona: true, organizacion: true } }, lineas: { include: { orden: { select: { numero: true } } } }, aplicaciones: { include: { cobro: { select: { fechaEfectiva: true, revertidoEn: true } } } } }, orderBy: [{ emitidaEn: 'desc' }, { id: 'desc' }] }),
      tx.cobroGerencial.findMany({ where: { fechaEfectiva: { lt: corte } }, include: { cliente: { include: { persona: true, organizacion: true } } }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }] }),
      tx.costoGerencial.findMany({ where: { fechaEfectiva: { lt: corte } }, include: { cliente: { include: { persona: true, organizacion: true } }, orden: { select: { numero: true } } }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }] }),
      tx.facturableGerencial.findMany({ where: { fechaEfectiva: { lt: corte } }, include: { cliente: { include: { persona: true, organizacion: true } }, concepto: { select: { nombre: true } }, aplicaciones: { include: { lineaComprobante: { include: { comprobante: { select: { anuladaEn: true } } } } } } }, orderBy: [{ fechaEfectiva: 'desc' }, { id: 'desc' }] }),
      tx.coberturaGerencial.findUnique({ where: { area: 'FINANCIERO' }, select: { desde: true, hastaVerificada: true, observacion: true } }),
    ]);
    return { comprobantes, cobros, costos, servicios, coverage };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return calcularIndicadoresFinancieros({ desde, hasta, ahora, ...snapshot });
}
