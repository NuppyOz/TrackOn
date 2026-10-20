import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: {} }));
import { calcularIndicadoresFinancieros, type FinancieroSnapshot } from '../src/modules/inteligencia/financiero/financiero.service.js';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const cliente = { id: 7, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null }, organizacion: null };
const make = (changes: Partial<FinancieroSnapshot> = {}): FinancieroSnapshot => ({
  desde: date('2026-01-01'), hasta: date('2026-02-01'), ahora: date('2026-02-15'),
  comprobantes: [{ id: 1, clienteId: 7, cliente, referencia: 'DOC-1', emitidaEn: date('2026-01-02'), venceEn: date('2026-01-20'), importeFinal: '100.00', anuladaEn: null, lineas: [{ id: 1, importe: '80.00', ordenId: 44, orden: { numero: 44n } }], aplicaciones: [{ importe: '40.00', cobro: { fechaEfectiva: date('2026-01-05'), revertidoEn: null } }] }],
  cobros: [{ id: 2, clienteId: 7, cliente, referencia: 'PAY-1', fechaEfectiva: date('2026-01-05'), importe: '40.00', revertidoEn: null }],
  costos: [{ id: 3, referencia: 'COST-1', clienteId: 7, cliente, ordenId: 44, orden: { numero: 44n }, comprobanteId: 1, categoria: 'MATERIAL', fechaEfectiva: date('2026-01-10'), importe: '30.00', revertidoEn: null }],
  servicios: [{ id: 4, referencia: 'SRV-1', clienteId: 7, cliente, conceptoId: 5, concepto: { nombre: 'Instalación' }, unidad: 'servicio', fechaEfectiva: date('2026-01-03'), cantidad: '2.000', aplicaciones: [{ cantidad: '0.500', fechaEfectiva: date('2026-01-12'), lineaComprobante: { comprobante: { anuladaEn: null } } }] }],
  coverage: { desde: date('2025-01-01'), hastaVerificada: date('2026-02-01'), observacion: 'Validado' },
  ...changes,
});
const metric = (data: ReturnType<typeof calcularIndicadoresFinancieros>, clave: string) => data.metricas.find(x => x.clave === clave)!;

describe('cálculo puro de indicadores BH06', () => {
  it('calcula los siete indicadores con centavos exactos y base de margen', () => {
    const result = calcularIndicadoresFinancieros(make());
    expect(result.metricas.map(x => x.clave)).toEqual(['facturacion', 'cobros', 'cuentas_por_cobrar', 'cuentas_vencidas', 'costos', 'resultado_registrado', 'margen_porcentaje']);
    expect(metric(result, 'facturacion').valor).toBe('100.00');
    expect(metric(result, 'cobros').valor).toBe('40.00');
    expect(metric(result, 'cuentas_por_cobrar').valor).toBe('60.00');
    expect(metric(result, 'cuentas_vencidas').valor).toBe('60.00');
    expect(metric(result, 'costos').valor).toBe('30.00');
    expect(metric(result, 'resultado_registrado').valor).toBe('70.00');
    expect(metric(result, 'margen_porcentaje')).toMatchObject({ valor: '70.00', base: { numerador: '70.00', denominador: '100.00' } });
  });

  it('usa historia anterior al rango y registra una reversión posterior como flujo negativo', () => {
    const base = make({
      comprobantes: [{ id: 8, clienteId: 7, cliente, referencia: 'DOC-OLD', emitidaEn: date('2025-12-01'), venceEn: date('2025-12-20'), importeFinal: '100.00', anuladaEn: date('2026-01-10'), lineas: [], aplicaciones: [] }],
      cobros: [], costos: [], servicios: [],
    });
    const result = calcularIndicadoresFinancieros(base);
    expect(metric(result, 'facturacion').valor).toBe('-100.00');
    expect(metric(result, 'cuentas_por_cobrar').valor).toBe('0.00');
    expect(metric(result, 'margen_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO' });
    expect(result.desgloses.find(x => x.tipo === 'COMPROBANTE')).toMatchObject({ netoPeriodo: '-100.00', anuladaEn: date('2026-01-10').toISOString() });
  });

  it('no clasifica una cuenta como vencida cuando vence exactamente al corte', () => {
    const result = calcularIndicadoresFinancieros(make({
      comprobantes: [{ id: 10, clienteId: 7, cliente, referencia: 'DOC-CORTE', emitidaEn: date('2026-01-02'), venceEn: date('2026-02-01'), importeFinal: '10.00', anuladaEn: null, lineas: [], aplicaciones: [] }],
      cobros: [], costos: [], servicios: [],
    }));
    expect(metric(result, 'cuentas_por_cobrar').valor).toBe('10.00');
    expect(metric(result, 'cuentas_vencidas').valor).toBe('0.00');
  });

  it('muestra una reversión de cobro de historia previa como flujo negativo y reabre CxC', () => {
    const oldPayment = { fechaEfectiva: date('2025-12-15'), revertidoEn: date('2026-01-10') };
    const result = calcularIndicadoresFinancieros(make({
      comprobantes: [{ id: 11, clienteId: 7, cliente, referencia: 'DOC-OLD-PAGO', emitidaEn: date('2025-12-01'), venceEn: date('2025-12-20'), importeFinal: '100.00', anuladaEn: null, lineas: [], aplicaciones: [{ importe: '100.00', cobro: oldPayment }] }],
      cobros: [{ id: 12, clienteId: 7, cliente, referencia: 'PAY-OLD', fechaEfectiva: oldPayment.fechaEfectiva, importe: '100.00', revertidoEn: oldPayment.revertidoEn }],
      costos: [], servicios: [],
    }));
    expect(metric(result, 'cobros').valor).toBe('-100.00');
    expect(metric(result, 'cuentas_por_cobrar').valor).toBe('100.00');
    expect(metric(result, 'margen_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO' });
    expect(result.desgloses.find(x => x.tipo === 'COBRO')).toMatchObject({ netoPeriodo: '-100.00' });
  });

  it('recorta hasta al reloj, conserva utilidad OT por líneas y no replica la cabecera', () => {
    const result = calcularIndicadoresFinancieros(make({
      hasta: date('2026-03-01'), ahora: date('2026-01-15'),
      comprobantes: [...make().comprobantes, { id: 9, clienteId: 7, cliente, referencia: 'DOC-FUTURE', emitidaEn: date('2026-01-16'), venceEn: date('2026-02-01'), importeFinal: '500.00', anuladaEn: null, lineas: [], aplicaciones: [] }],
    }));
    expect(result.corteEvaluacion).toBe(date('2026-01-15').toISOString());
    expect(metric(result, 'facturacion').valor).toBe('100.00');
    expect(result.desgloses.find(x => x.tipo === 'RENTABILIDAD' && x.agrupacion === 'ORDEN')).toMatchObject({ ingresos: '80.00', costos: '30.00', resultado: '50.00' });
    expect(result.desgloses.find(x => x.tipo === 'RENTABILIDAD' && x.agrupacion === 'CLIENTE')).toMatchObject({ ingresos: '100.00', costos: '30.00' });
    expect(result.desgloses.some(x => x.tipo === 'COMPROBANTE' && x.id === 9)).toBe(false);
  });

  it('descuenta servicios sólo por aplicaciones a comprobantes vigentes al corte', () => {
    const base = make({ servicios: [{ ...make().servicios[0]!, aplicaciones: [
      { cantidad: '0.500', fechaEfectiva: date('2026-01-12'), lineaComprobante: { comprobante: { anuladaEn: date('2026-02-10') } } },
      { cantidad: '0.250', fechaEfectiva: date('2026-01-12'), lineaComprobante: { comprobante: { anuladaEn: date('2026-01-10') } } },
    ] }] });
    expect(calcularIndicadoresFinancieros(base).desgloses.find(x => x.tipo === 'FACTURABLE')).toMatchObject({ cantidad: '2.000', pendiente: '1.500' });
  });
});
