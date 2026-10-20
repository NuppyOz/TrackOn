import { describe, expect, it } from 'vitest';
import { proyectarTablero } from '../src/modules/inteligencia/asistente/asistente.proyeccion.js';

const tablero = (metricas: unknown[]) => ({
  desde: '2026-01-01T00:00:00.000Z', hasta: '2026-01-31T00:00:00.000Z', corteEvaluacion: '2026-01-20T00:00:00.000Z',
  zonaHoraria: 'America/Managua', registrosSinAsignar: 1,
  cobertura: { estado: 'PARCIAL', desde: null, hastaVerificada: null, observaciones: ['CONTACTO CONFIDENCIAL'] },
  metricas,
  desgloses: [{ clienteNombre: 'PERSONA PRIVADA', referencia: 'DOC-99' }],
});

describe('proyección agregada privada del asistente', () => {
  it('filtra métricas y campos extra, fuentes dinámicas, motivos y valores textuales', () => {
    const result = proyectarTablero('comercial', tablero([
      { clave: 'ventas_importe', valor: '100.25', unidad: 'NIO', estado: 'CALCULADO', fuentes: ['fuente_inyectada'], motivo: 'CLIENTE PRIVADO' },
      { clave: 'cotizaciones_total', valor: 'NOMBRE DE PERSONA', unidad: 'cantidad', estado: 'CALCULADO' },
      { clave: 'desglose_cliente', valor: 3, unidad: 'cantidad', estado: 'CALCULADO' },
      { clave: 'constructor', valor: 'injected', unidad: 'cantidad', estado: 'CALCULADO' },
    ]));
    expect(result.proyeccion.metricas).toEqual([{ clave: 'ventas_importe', valor: '100.25', unidad: 'NIO', estado: 'CALCULADO' }]);
    expect(result.fuentes).toEqual(['ventas_comerciales']);
    expect(JSON.stringify(result)).not.toMatch(/PERSONA PRIVADA|CONTACTO CONFIDENCIAL|CLIENTE PRIVADO|fuente_inyectada|DOC-99/);
  });

  it('produce SHA-256 estable ordenando métricas y sus claves canónicas', () => {
    const a = proyectarTablero('financiero', tablero([
      { clave: 'costos', valor: '-5.00', unidad: 'NIO', estado: 'CALCULADO' },
      { clave: 'margen_porcentaje', valor: null, unidad: 'porcentaje', estado: 'SIN_BASE_DE_CALCULO', base: { numerador: '-5.00', denominador: '0.00', extra: 'se descarta' } },
    ]));
    const b = proyectarTablero('financiero', tablero([
      { clave: 'margen_porcentaje', valor: null, unidad: 'porcentaje', estado: 'SIN_BASE_DE_CALCULO', base: { denominador: '0.00', numerador: '-5.00' } },
      { clave: 'costos', valor: '-5.00', unidad: 'NIO', estado: 'CALCULADO' },
    ]));
    expect(a.snapshotId).toMatch(/^[a-f0-9]{64}$/);
    expect(a.snapshotId).toBe(b.snapshotId);
    expect(a.proyeccion.metricas[1]).toEqual({ clave: 'margen_porcentaje', valor: null, unidad: 'porcentaje', estado: 'SIN_BASE_DE_CALCULO', base: { numerador: '-5.00', denominador: '0.00' } });
  });
});
