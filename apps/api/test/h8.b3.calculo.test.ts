import { describe, expect, it } from 'vitest';
import { calcularIndicadoresCalidad, type SnapshotCalidad } from '../src/modules/inteligencia/calidad/calidad.calculo.js';

const fecha = (value: string) => new Date(value);
const cliente = (id: number) => ({ id, persona: { firstName: `Cliente${id}`, secondName: null, firstLastName: 'Prueba', secondLastName: null }, organizacion: null });
const base = (overrides: Partial<SnapshotCalidad> = {}): SnapshotCalidad => ({
  desde: fecha('2026-01-01T00:00:00Z'), hasta: fecha('2026-04-01T00:00:00Z'), ahora: fecha('2026-04-02T00:00:00Z'),
  garantias: [], casos: [], retrabajos: [], correctivas: [], cobertura: null, hayFuente: false, ...overrides,
});

describe('BH08 cálculo puro al corte', () => {
  it('trata cierre exactamente al corte como abierto y excluye plazos exactamente al corte', () => {
    const tablero = calcularIndicadoresCalidad(base({
      hayFuente: true,
      casos: [{ id: 1, referencia: 'CASO-1', clienteId: 1, cliente: cliente(1), activoReferencia: 'ACT-1', codigoFalla: 'F-1', abiertaEn: fecha('2026-02-01T00:00:00Z'), anteriorId: null,
        respondidaEn: fecha('2026-04-01T00:00:00Z'), resueltaEn: fecha('2026-03-20T00:00:00Z'), cerradaEn: fecha('2026-04-01T00:00:00Z'),
        respuestaLimiteEn: fecha('2026-04-01T00:00:00Z'), resolucionLimiteEn: null }],
    }));
    const metric = (clave: string) => tablero.metricas.find(item => item.clave === clave)!;
    const caso = tablero.desgloses.find(item => item.tipo === 'CASO');
    expect(metric('reclamos_abiertos').valor).toBe(1);
    expect(metric('sla_respuesta_porcentaje')).toMatchObject({ valor: null, base: { numerador: 0, denominador: 0 } });
    expect(caso).toMatchObject({ estadoAlCorte: 'RESUELTO', respuestaEvaluable: false, respuestaCumple: null });
  });

  it('agrupa fallas por cliente, activo y código en 90 días y valida la relación anterior', () => {
    const caso = (id: number, clienteId: number, abierta: string, anteriorId: number | null) => ({ id, referencia: `CASO-${id}`, clienteId, cliente: cliente(clienteId), activoReferencia: 'ACT-1', codigoFalla: 'F-1', abiertaEn: fecha(abierta), anteriorId, respondidaEn: null, resueltaEn: null, cerradaEn: null, respuestaLimiteEn: null, resolucionLimiteEn: null });
    const tablero = calcularIndicadoresCalidad(base({ hayFuente: true, casos: [
      caso(1, 1, '2026-01-05T00:00:00Z', null),
      caso(2, 1, '2026-03-30T00:00:00Z', 1),
      caso(3, 1, '2026-03-31T00:00:00Z', 999),
      caso(4, 2, '2026-03-31T00:00:00Z', null),
      caso(5, 1, '2025-12-31T23:59:59Z', null),
      caso(6, 1, '2026-01-01T00:00:00Z', null),
    ] }));
    expect(tablero.metricas.find(item => item.clave === 'reincidencias')?.valor).toBe(1);
    expect(tablero.metricas.find(item => item.clave === 'fallas_repetidas_grupos')?.valor).toBe(1);
    expect(tablero.desgloses.find(item => item.tipo === 'FALLA_REPETIDA')).toMatchObject({ clienteId: 1, cantidad: 4, casoIds: [1, 2, 3, 6] });
  });

  it('no proyecta eventos ni desgloses cuando el rango empieza desde el corte hacia el futuro', () => {
    const tablero = calcularIndicadoresCalidad(base({ desde: fecha('2026-04-02T00:00:00Z'), hasta: fecha('2026-04-03T00:00:00Z'), ahora: fecha('2026-04-02T00:00:00Z'), hayFuente: true }));
    expect(tablero.desgloses).toEqual([]);
    expect(tablero.metricas.map(item => item.valor)).toEqual([0, 0, 0, 0, 0, null, null, 0, 0]);
    expect(tablero.cobertura.observaciones.join(' ')).toContain('no hay base futura');
  });

  it('marca como incumplidos los SLA vencidos pendientes y mantiene denominadores independientes', () => {
    const casoBase = (id: number) => ({ id, referencia: `CASO-${id}`, clienteId: 1, cliente: cliente(1), activoReferencia: `ACT-${id}`, codigoFalla: 'F-1', abiertaEn: fecha('2026-02-01T00:00:00Z'), anteriorId: null, respondidaEn: null, resueltaEn: null, cerradaEn: null,
      respuestaLimiteEn: fecha('2026-03-01T00:00:00Z'), resolucionLimiteEn: fecha('2026-03-02T00:00:00Z') });
    const tablero = calcularIndicadoresCalidad(base({ hayFuente: true, casos: [
      { ...casoBase(1), respondidaEn: fecha('2026-03-01T00:00:01Z') },
      { ...casoBase(2), respuestaLimiteEn: fecha('2026-03-05T00:00:00Z'), respondidaEn: fecha('2026-03-04T00:00:00Z') },
    ] }));
    expect(tablero.metricas.find(item => item.clave === 'sla_respuesta_porcentaje')).toMatchObject({ valor: '50.00', base: { numerador: 1, denominador: 2 } });
    expect(tablero.metricas.find(item => item.clave === 'sla_resolucion_porcentaje')).toMatchObject({ valor: '0.00', base: { numerador: 0, denominador: 2 } });
    expect(tablero.metricas.map(item => item.clave)).toEqual(['garantias_vigentes', 'reclamos_abiertos', 'reincidencias', 'retrabajos', 'fallas_repetidas_grupos', 'sla_respuesta_porcentaje', 'sla_resolucion_porcentaje', 'correctivas_abiertas', 'correctivas_vencidas']);
  });
});
