import { decimalFijo, milesimas, valorNano } from '../../fuentes-gerenciales/contracts/precision.js';

export type MovimientoLogistico = {
  id: number; tipo: string; cantidad: string; valor: string; saldoCantidad: string; saldoValor: string;
  fechaEfectiva: Date; origenTipo: string | null;
};
export type ArticuloLogistico = {
  id: number; codigo: string; nombre: string; unidad: string; minimo: string; movimientos: MovimientoLogistico[];
};
export type LineaCompraLogistico = {
  id: number; compraId: number; compraReferencia: string; proveedor: string; articuloId: number; articuloCodigo: string;
  unidad: string; cantidad: string; cantidadCancelada: string; canceladaEn: Date | null; prometidaEn: Date;
  compraFecha: Date; recepciones: { cantidad: string; fechaEfectiva: Date }[];
};
export type RecepcionLogistico = {
  id: number; referencia: string; compraId: number; compraReferencia: string; proveedor: string; articuloId: number;
  articuloCodigo: string; unidad: string; cantidad: string; fechaEfectiva: Date; prometidaEn: Date;
};
export type PrestamoLogistico = {
  id: number; herramientaId: number; codigo: string; nombre: string; empleadoId: number; empleadoNombre: string;
  prestadaEn: Date; previstaEn: Date; devueltaEn: Date | null;
};
export type LogisticoSnapshot = {
  desde: Date; hasta: Date; ahora: Date;
  articulos: ArticuloLogistico[]; lineas: LineaCompraLogistico[]; recepciones: RecepcionLogistico[]; prestamos: PrestamoLogistico[];
  coverage: { desde: Date; hastaVerificada: Date; observacion: string | null } | null;
};

const iso = (value: Date) => value.toISOString();
const nullableIso = (value: Date | null) => value?.toISOString() ?? null;
const qty = (value: string) => milesimas(value, true);
const valor = (value: string) => valorNano(value);
const entre = (fecha: Date, desde: Date, hasta: Date) => fecha >= desde && fecha < hasta;
const max0 = (n: bigint) => n < 0n ? 0n : n;

function stockAlCorte(movimientos: MovimientoLogistico[], corte: Date) {
  const historicos = movimientos.filter(m => m.fechaEfectiva < corte).sort((a, b) => a.fechaEfectiva.getTime() - b.fechaEfectiva.getTime() || a.id - b.id);
  const apertura = historicos.find(m => m.tipo === 'APERTURA');
  const ultimo = historicos.at(-1);
  return apertura && ultimo ? { apertura, ultimo, historicos } : null;
}
function consumoNeto(movimientos: MovimientoLogistico[], desde: Date, corte: Date) {
  let total = 0n;
  for (const movimiento of movimientos) {
    if (!entre(movimiento.fechaEfectiva, desde, corte)) continue;
    const cantidad = qty(movimiento.cantidad);
    if (movimiento.tipo === 'CONSUMO') total += cantidad;
    else if (movimiento.tipo === 'DEVOLUCION') total -= cantidad;
    else if (movimiento.tipo === 'REVERSO' && movimiento.origenTipo === 'CONSUMO') total -= cantidad;
    else if (movimiento.tipo === 'REVERSO' && movimiento.origenTipo === 'DEVOLUCION') total += cantidad;
  }
  return total;
}
function integralStock(movimientos: MovimientoLogistico[], desde: Date, corte: Date) {
  const sorted = movimientos.filter(m => m.fechaEfectiva <= corte).sort((a, b) => a.fechaEfectiva.getTime() - b.fechaEfectiva.getTime() || a.id - b.id);
  let stock = 0n, cursor = desde.getTime(), integral = 0n;
  for (const movement of sorted) {
    const instant = movement.fechaEfectiva.getTime();
    if (instant < desde.getTime()) { stock = qty(movement.saldoCantidad); continue; }
    if (instant > cursor) integral += stock * BigInt(instant - cursor);
    stock = qty(movement.saldoCantidad);
    cursor = Math.max(cursor, instant);
  }
  if (corte.getTime() > cursor) integral += stock * BigInt(corte.getTime() - cursor);
  return integral;
}
function itemArticulo(articulo: ArticuloLogistico, desde: Date, corte: Date, sinBase: boolean) {
  const historico = stockAlCorte(articulo.movimientos, corte);
  if (!historico) return null;
  const stock = qty(historico.ultimo.saldoCantidad), minimo = qty(articulo.minimo), value = valor(historico.ultimo.saldoValor);
  const consumo = consumoNeto(articulo.movimientos, desde, corte);
  const duracion = BigInt(Math.max(0, corte.getTime() - desde.getTime()));
  let stockMedio: string | null = null, rotacion: string | null = null, motivo: string | null = null;
  if (historico.apertura.fechaEfectiva.getTime() > desde.getTime()) motivo = 'SIN_COBERTURA_ARTICULO';
  else if (sinBase || duracion === 0n) motivo = 'SIN_BASE_DE_CALCULO';
  else {
    const integral = integralStock(historico.historicos, desde, corte);
    if (integral <= 0n) {
      stockMedio = '0.000000';
      motivo = 'SIN_BASE_DE_CALCULO';
    } else {
      // Integral is milli-units × milliseconds; scale by 1000 to report units to six decimals.
      const averageMicro = (integral * 1000n + duracion / 2n) / duracion;
      stockMedio = decimalFijo(averageMicro, 6);
      if (consumo < 0n) motivo = 'CONSUMO_NETO_NEGATIVO';
      else rotacion = decimalFijo((consumo * duracion * 1_000_000n + integral / 2n) / integral, 6);
    }
  }
  return { tipo: 'ARTICULO' as const, id: articulo.id, codigo: articulo.codigo, nombre: articulo.nombre, unidad: articulo.unidad,
    stock: decimalFijo(stock, 3), minimo: decimalFijo(minimo, 3), valor: decimalFijo(value, 9), consumoNeto: decimalFijo(consumo, 3), stockMedio, rotacion, motivo };
}
function lineaAlCorte(linea: LineaCompraLogistico, corte: Date) {
  if (linea.compraFecha >= corte) return null;
  const recibido = linea.recepciones.reduce((sum, r) => sum + (r.fechaEfectiva < corte ? qty(r.cantidad) : 0n), 0n);
  const cancelado = linea.canceladaEn !== null && linea.canceladaEn < corte ? qty(linea.cantidadCancelada) : 0n;
  const pendiente = qty(linea.cantidad) - recibido - cancelado;
  if (pendiente < 0n) throw new Error('La línea de compra supera el compromiso histórico.');
  if (pendiente === 0n) return null;
  return { tipo: 'COMPRA_LINEA' as const, id: linea.id, compraId: linea.compraId, compraReferencia: linea.compraReferencia, proveedor: linea.proveedor,
    articuloId: linea.articuloId, articuloCodigo: linea.articuloCodigo, unidad: linea.unidad, cantidad: decimalFijo(qty(linea.cantidad), 3),
    recibido: decimalFijo(recibido, 3), cancelado: decimalFijo(cancelado, 3), pendiente: decimalFijo(pendiente, 3), prometidaEn: iso(linea.prometidaEn) };
}

export function calcularIndicadoresLogisticos(snapshot: LogisticoSnapshot) {
  const { desde, hasta, ahora } = snapshot;
  const corte = hasta < ahora ? hasta : ahora;
  const sinBase = desde >= corte;
  const articulos = snapshot.articulos.map(articulo => itemArticulo(articulo, desde, corte, sinBase)).filter((item): item is NonNullable<typeof item> => item !== null);
  const lineas = snapshot.lineas.map(linea => lineaAlCorte(linea, corte)).filter((item): item is NonNullable<typeof item> => item !== null);
  const recepciones = snapshot.recepciones.filter(receipt => entre(receipt.fechaEfectiva, desde, corte)).map(receipt => ({
    tipo: 'RECEPCION' as const, id: receipt.id, referencia: receipt.referencia, compraId: receipt.compraId, compraReferencia: receipt.compraReferencia,
    proveedor: receipt.proveedor, articuloId: receipt.articuloId, articuloCodigo: receipt.articuloCodigo, unidad: receipt.unidad,
    cantidad: receipt.cantidad, fecha: iso(receipt.fechaEfectiva), prometidaEn: iso(receipt.prometidaEn), tardia: receipt.fechaEfectiva > receipt.prometidaEn,
  }));
  const prestamos = snapshot.prestamos.filter(loan => loan.prestadaEn < corte && (loan.devueltaEn === null || loan.devueltaEn >= corte));
  const herramientas = prestamos.map(loan => ({ tipo: 'HERRAMIENTA' as const, id: loan.herramientaId, codigo: loan.codigo, nombre: loan.nombre,
    prestamoId: loan.id, empleadoId: loan.empleadoId, empleadoNombre: loan.empleadoNombre, prestadaEn: iso(loan.prestadaEn), previstaEn: iso(loan.previstaEn), vencida: loan.previstaEn < corte }));
  const valorTotal = articulos.reduce((sum, item) => sum + valor(item.valor), 0n);
  const stockCritico = articulos.filter(item => qty(item.stock) === 0n || qty(item.stock) < qty(item.minimo)).length;
  const hayFuente = articulos.length + snapshot.lineas.filter(line => line.compraFecha < corte).length + snapshot.recepciones.filter(r => r.fechaEfectiva < corte).length + snapshot.prestamos.filter(l => l.prestadaEn < corte).length > 0;
  const coberturaCompleta = snapshot.coverage !== null && snapshot.coverage.desde <= desde && snapshot.coverage.hastaVerificada >= corte && !sinBase;
  const estadoCobertura = !hayFuente ? 'SIN_REGISTROS' as const : coberturaCompleta ? 'COMPLETA' as const : 'PARCIAL' as const;
  const observaciones = [snapshot.coverage?.observacion,
    ...(coberturaCompleta || !hayFuente ? [] : ['La cobertura logística no está verificada para todo el rango consultado.']),
    ...(hasta > ahora ? [`El rango solicitado llega hasta ${iso(hasta)}; se evaluó hasta ${iso(corte)}.`] : []),
    ...(sinBase ? ['El rango comienza después del corte de evaluación; no hay base futura para los indicadores de período.'] : []),
  ].filter((value): value is string => Boolean(value));
  const metricas = [
    { clave: 'stock_critico_cantidad', valor: stockCritico, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['articulos_gerenciales', 'movimientos_gerenciales'], motivo: null },
    { clave: 'compras_pendientes_cantidad', valor: lineas.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['compras_gerenciales', 'lineas_compras_gerenciales', 'recepciones_gerenciales'], motivo: null },
    { clave: 'herramientas_prestadas', valor: prestamos.length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['prestamos_herramientas_gerenciales'], motivo: null },
    { clave: 'herramientas_vencidas', valor: prestamos.filter(loan => loan.previstaEn < corte).length, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['prestamos_herramientas_gerenciales'], motivo: null },
    { clave: 'inventario_valorizado', valor: decimalFijo(valorTotal, 9), unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['articulos_gerenciales', 'movimientos_gerenciales'], motivo: null },
  ];
  const desgloses = [...articulos, ...lineas, ...recepciones, ...herramientas].sort((a, b) => {
    const fechaA = 'fecha' in a ? a.fecha : 'prometidaEn' in a ? a.prometidaEn : 'prestadaEn' in a ? a.prestadaEn : '';
    const fechaB = 'fecha' in b ? b.fecha : 'prometidaEn' in b ? b.prometidaEn : 'prestadaEn' in b ? b.prestadaEn : '';
    return fechaB.localeCompare(fechaA) || b.id - a.id || a.tipo.localeCompare(b.tipo);
  });
  return { desde: iso(desde), hasta: iso(hasta), corteEvaluacion: iso(corte), zonaHoraria: 'America/Managua' as const,
    cobertura: { estado: estadoCobertura, desde: nullableIso(snapshot.coverage?.desde ?? null), hastaVerificada: nullableIso(snapshot.coverage?.hastaVerificada ?? null), observaciones },
    metricas, desgloses, registrosSinAsignar: 0 };
}
