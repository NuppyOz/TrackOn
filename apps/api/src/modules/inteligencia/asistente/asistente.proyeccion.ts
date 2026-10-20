import { createHash } from 'node:crypto';
import type { ExplicarInput } from './asistente.schema.js';

type DescripcionMetrica = { unidad: string; fuente: readonly string[] };
const metricasPermitidas: Record<ExplicarInput['area'], Readonly<Record<string, DescripcionMetrica>>> = {
  comercial: {
    cotizaciones_total: { unidad: 'cantidad', fuente: ['cotizaciones_comerciales'] },
    conversion_porcentaje: { unidad: 'porcentaje', fuente: ['cotizaciones_comerciales'] },
    ventas_cantidad: { unidad: 'cantidad', fuente: ['ventas_comerciales'] },
    ventas_importe: { unidad: 'NIO', fuente: ['ventas_comerciales'] },
    clientes_con_ventas: { unidad: 'cantidad', fuente: ['ventas_comerciales'] },
    ticket_promedio: { unidad: 'NIO', fuente: ['ventas_comerciales'] },
    contratos_activos: { unidad: 'cantidad', fuente: ['contratos_gerenciales'] },
    renovaciones_cantidad: { unidad: 'cantidad', fuente: ['contratos_gerenciales'] },
    renovacion_porcentaje: { unidad: 'porcentaje', fuente: ['contratos_gerenciales'] },
  },
  financiero: {
    facturacion: { unidad: 'NIO', fuente: ['comprobantes_gerenciales'] },
    cobros: { unidad: 'NIO', fuente: ['cobros_gerenciales'] },
    cuentas_por_cobrar: { unidad: 'NIO', fuente: ['comprobantes_gerenciales', 'aplicaciones_cobros_gerenciales'] },
    cuentas_vencidas: { unidad: 'NIO', fuente: ['comprobantes_gerenciales', 'aplicaciones_cobros_gerenciales'] },
    costos: { unidad: 'NIO', fuente: ['costos_gerenciales'] },
    resultado_registrado: { unidad: 'NIO', fuente: ['comprobantes_gerenciales', 'costos_gerenciales'] },
    margen_porcentaje: { unidad: 'porcentaje', fuente: ['comprobantes_gerenciales', 'costos_gerenciales'] },
  },
  logistico: {
    stock_critico_cantidad: { unidad: 'cantidad', fuente: ['articulos_gerenciales', 'movimientos_gerenciales'] },
    compras_pendientes_cantidad: { unidad: 'cantidad', fuente: ['compras_gerenciales', 'lineas_compras_gerenciales', 'recepciones_gerenciales'] },
    herramientas_prestadas: { unidad: 'cantidad', fuente: ['prestamos_herramientas_gerenciales'] },
    herramientas_vencidas: { unidad: 'cantidad', fuente: ['prestamos_herramientas_gerenciales'] },
    inventario_valorizado: { unidad: 'NIO', fuente: ['articulos_gerenciales', 'movimientos_gerenciales'] },
  },
  calidad: {
    garantias_vigentes: { unidad: 'cantidad', fuente: ['garantias_gerenciales'] },
    reclamos_abiertos: { unidad: 'cantidad', fuente: ['casos_calidad_gerenciales'] },
    reincidencias: { unidad: 'cantidad', fuente: ['casos_calidad_gerenciales'] },
    retrabajos: { unidad: 'cantidad', fuente: ['retrabajos_gerenciales'] },
    fallas_repetidas_grupos: { unidad: 'cantidad', fuente: ['casos_calidad_gerenciales'] },
    sla_respuesta_porcentaje: { unidad: 'porcentaje', fuente: ['casos_calidad_gerenciales'] },
    sla_resolucion_porcentaje: { unidad: 'porcentaje', fuente: ['casos_calidad_gerenciales'] },
    correctivas_abiertas: { unidad: 'cantidad', fuente: ['correctivas_gerenciales'] },
    correctivas_vencidas: { unidad: 'cantidad', fuente: ['correctivas_gerenciales'] },
  },
};

export type ProyeccionMetrica = { clave: string; valor: number | string | null; unidad: string; estado: 'CALCULADO' | 'SIN_BASE_DE_CALCULO'; base?: { numerador: number | string; denominador: number | string } };
export type ProyeccionAsistente = {
  area: ExplicarInput['area']; desde: string; hasta: string; corte: string;
  cobertura: { estado: 'COMPLETA' | 'PARCIAL' | 'SIN_REGISTROS'; desde: string | null; hastaVerificada: string | null };
  metricas: ProyeccionMetrica[];
};

const esObjeto = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const textoIso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const numeroSeguro = (value: unknown): number | string | null | undefined => {
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value))) return value;
  return undefined;
};

function baseSegura(value: unknown): ProyeccionMetrica['base'] | undefined {
  if (!esObjeto(value)) return undefined;
  const numerador = numeroSeguro(value.numerador), denominador = numeroSeguro(value.denominador);
  if (numerador === undefined || denominador === undefined || numerador === null || denominador === null) return undefined;
  return { numerador, denominador };
}

export function proyectarTablero(area: ExplicarInput['area'], tablero: unknown) {
  if (!esObjeto(tablero) || !esObjeto(tablero.cobertura) || !Array.isArray(tablero.metricas)) throw new Error('El tablero no tiene una estructura válida.');
  const desde = textoIso(tablero.desde), hasta = textoIso(tablero.hasta), corte = textoIso(tablero.corteEvaluacion);
  if (!desde || !hasta || !corte) throw new Error('El tablero no tiene fechas válidas.');
  const coberturaRaw = tablero.cobertura;
  const coberturaEstado = ['COMPLETA', 'PARCIAL', 'SIN_REGISTROS'].includes(String(coberturaRaw.estado)) ? coberturaRaw.estado as ProyeccionAsistente['cobertura']['estado'] : 'PARCIAL';
  const metricasByKey = new Map<string, ProyeccionMetrica>();
  const fuentes = new Set<string>();
  for (const raw of tablero.metricas) {
    if (!esObjeto(raw) || typeof raw.clave !== 'string') continue;
    if (!Object.hasOwn(metricasPermitidas[area], raw.clave)) continue;
    const descripcion = metricasPermitidas[area][raw.clave];
    if (!descripcion || raw.unidad !== descripcion.unidad || (raw.estado !== 'CALCULADO' && raw.estado !== 'SIN_BASE_DE_CALCULO')) continue;
    const valor = numeroSeguro(raw.valor);
    if (valor === undefined) continue;
    const metrica: ProyeccionMetrica = { clave: raw.clave, valor, unidad: descripcion.unidad, estado: raw.estado };
    const base = baseSegura(raw.base);
    if (base) metrica.base = base;
    metricasByKey.set(raw.clave, metrica);
    for (const fuente of descripcion.fuente) fuentes.add(fuente);
  }
  const proyeccion: ProyeccionAsistente = {
    area, desde, hasta, corte,
    cobertura: { estado: coberturaEstado, desde: textoIso(coberturaRaw.desde), hastaVerificada: textoIso(coberturaRaw.hastaVerificada) },
    metricas: [...metricasByKey.values()].sort((a, b) => a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0),
  };
  const canonico = JSON.stringify(proyeccion);
  return { proyeccion, snapshotId: createHash('sha256').update(canonico).digest('hex'), fuentes: [...fuentes].sort() };
}
