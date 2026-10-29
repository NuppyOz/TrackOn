import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: {} }));
import { calcularIndicadoresComerciales, type ComercialSnapshot } from '../src/modules/inteligencia/comercial/comercial.service.js';

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const makeSnapshot = (changes: Partial<ComercialSnapshot> = {}): ComercialSnapshot => ({
  desde: date('2026-01-01'), hasta: date('2026-01-31'), ahora: date('2026-02-01'),
  quotes: [{ id: 1, clienteId: 7, total: '19.99', estado: 'APROBADA', venceEn: date('2026-01-20'), creadaEn: date('2026-01-02') }],
  sales: [{ id: 4, clienteId: 7, total: '100.00', confirmadaEn: date('2026-01-05') }],
  contracts: [{ id: 9, clienteId: 7, referencia: 'CTR-9', inicio: date('2025-12-01'), fin: date('2026-01-31'), importe: '40.00', terminadoEn: date('2026-01-31'), anteriorId: null }],
  contratosActivos: 1, renovaciones: 1, padresVencen: [{ successorStart: date('2026-01-20') }],
  cohorteEnviada: [{ estado: 'APROBADA' }, { estado: 'ENVIADA' }],
  coverage: { desde: date('2025-01-01'), hastaVerificada: date('2026-01-31'), observacion: 'Verificación humana' },
  hayFuente: true,
  ...changes,
});
const metric = (data: ReturnType<typeof calcularIndicadoresComerciales>, clave: string) => data.metricas.find(item => item.clave === clave)!;

describe('cálculo puro de indicadores H5', () => {
  it('mantiene distintas las cotizaciones creadas y la cohorte enviada', () => {
    const result = calcularIndicadoresComerciales(makeSnapshot());
    expect(metric(result, 'cotizaciones_total').valor).toBe(1);
    expect(metric(result, 'conversion_porcentaje')).toMatchObject({ valor: '50.00', base: { numerador: 1, denominador: 2 } });
  });

  it('calcula ventas, clientes, ticket y renovación con valores NIO exactos', () => {
    const result = calcularIndicadoresComerciales(makeSnapshot());
    expect(metric(result, 'ventas_importe').valor).toBe('100.00');
    expect(metric(result, 'ticket_promedio').valor).toBe('100.00');
    expect(metric(result, 'clientes_con_ventas').valor).toBe(1);
    expect(metric(result, 'contratos_activos').valor).toBe(1);
    expect(metric(result, 'renovacion_porcentaje')).toMatchObject({ valor: '100.00', base: { numerador: 1, denominador: 1 } });
  });

  it('conserva la base y devuelve null cuando no hay denominador', () => {
    const result = calcularIndicadoresComerciales(makeSnapshot({ cohorteEnviada: [], padresVencen: [] }));
    expect(metric(result, 'conversion_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO', base: { numerador: 0, denominador: 0 } });
    expect(metric(result, 'renovacion_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO', base: { numerador: 0, denominador: 0 } });
  });

  it('no proyecta actividad cuando el rango empieza después del corte', () => {
    const result = calcularIndicadoresComerciales(makeSnapshot({ desde: date('2026-02-02'), hasta: date('2026-03-01') }));
    expect(metric(result, 'ventas_cantidad').valor).toBe(0);
    expect(metric(result, 'conversion_porcentaje').valor).toBeNull();
    expect(metric(result, 'contratos_activos')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO' });
    expect(result.desgloses).toEqual([]);
    expect(result.cobertura.observaciones.join(' ')).toContain('no hay base futura');
  });

  it('la cobertura sin fuente operacional sigue siendo SIN_REGISTROS', () => {
    const result = calcularIndicadoresComerciales(makeSnapshot({ hayFuente: false }));
    expect(result.cobertura.estado).toBe('SIN_REGISTROS');
  });
});
