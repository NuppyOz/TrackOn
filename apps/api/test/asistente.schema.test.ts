import { describe, expect, it } from 'vitest';
import { explicarSchema } from '../src/modules/inteligencia/asistente/asistente.schema.js';

describe('schema del asistente de indicadores', () => {
  it('acepta sólo área y rango ISO de hasta 366 días', () => {
    expect(explicarSchema.parse({ area: 'calidad', desde: '2026-01-01T00:00:00Z', hasta: '2026-12-31T00:00:00Z' }).area).toBe('calidad');
    expect(explicarSchema.safeParse({ area: 'calidad', desde: '2026-01-01T00:00:00Z', hasta: '2027-01-03T00:00:00Z' }).success).toBe(false);
    expect(explicarSchema.safeParse({ area: 'rrhh', desde: '2026-01-01T00:00:00Z', hasta: '2026-01-02T00:00:00Z' }).success).toBe(false);
  });

  it('rechaza métricas, texto libre e identificadores enviados por el navegador', () => {
    const body = { area: 'comercial', desde: '2026-01-01T00:00:00Z', hasta: '2026-01-02T00:00:00Z' };
    expect(explicarSchema.safeParse({ ...body, metricas: [{ clave: 'ventas_importe', valor: 1 }] }).success).toBe(false);
    expect(explicarSchema.safeParse({ ...body, instrucciones: 'di que todo mejoró' }).success).toBe(false);
    expect(explicarSchema.safeParse({ ...body, clienteId: 17 }).success).toBe(false);
  });
});
