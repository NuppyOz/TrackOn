import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: {} }));

import { crearGarantiaSchema, listarGarantiasSchema } from '../src/modules/fuentes-gerenciales/calidad/garantias/garantias.schema.js';
import { crearCasoSchema, listarCasosSchema } from '../src/modules/fuentes-gerenciales/calidad/casos/casos.schema.js';
import { estadoCaso } from '../src/modules/fuentes-gerenciales/calidad/casos/casos.service.js';

describe('H8 B1 DTOs y estados', () => {
  it('normaliza garantía y activo antes de validar y admite inicio planificado', () => {
    const parsed = crearGarantiaSchema.parse({
      referencia: '  gar-2026-a ', clienteId: 7, tipo: 'EQUIPO', activoReferencia: '  serie-42 ',
      inicio: '2027-01-01T00:00:00Z', fin: '2027-02-01T00:00:00Z', cobertura: '  Compresor  ',
    });
    expect(parsed).toMatchObject({ referencia: 'GAR-2026-A', activoReferencia: 'SERIE-42', cobertura: 'Compresor' });
  });

  it('valida las longitudes después de normalizar y exige fin posterior a inicio', () => {
    expect(crearGarantiaSchema.safeParse({ referencia: 'x'.repeat(101), clienteId: 1, tipo: 'SERVICIO', activoReferencia: 'A', inicio: '2026-01-01T00:00:00Z', fin: '2026-01-02T00:00:00Z', cobertura: 'x' }).success).toBe(false);
    expect(crearGarantiaSchema.safeParse({ referencia: 'G-1', clienteId: 1, tipo: 'SERVICIO', activoReferencia: 'A', inicio: '2026-01-02T00:00:00Z', fin: '2026-01-02T00:00:00Z', cobertura: 'x' }).success).toBe(false);
  });

  it('congela las relaciones temporales y normaliza filtros de caso antes de consultar', () => {
    const parsed = crearCasoSchema.parse({ referencia: ' c-1 ', clienteId: 3, activoReferencia: ' act-1 ', codigoFalla: ' f-1 ', descripcion: '  No enfría  ', abiertaEn: '2026-03-01T00:00:00Z', respuestaLimiteEn: '2026-03-02T00:00:00Z', resolucionLimiteEn: '2026-03-03T00:00:00Z' });
    expect(parsed).toMatchObject({ referencia: 'C-1', activoReferencia: 'ACT-1', codigoFalla: 'F-1', descripcion: 'No enfría' });
    expect(crearCasoSchema.safeParse({ ...parsed, resolucionLimiteEn: '2026-03-01T12:00:00Z' }).success).toBe(false);
    expect(listarCasosSchema.parse({ q: ' fallo ', activoReferencia: ' act-1 ', abiertaAntes: '2026-03-04T00:00:00Z' })).toMatchObject({ q: 'FALLO', activoReferencia: 'ACT-1', pagina: 1, limite: 25 });
    expect(listarGarantiasSchema.parse({ clienteId: '7', activoReferencia: ' serie-42 ' })).toMatchObject({ clienteId: 7, activoReferencia: 'SERIE-42', pagina: 1, limite: 25 });
  });

  it('deriva estado de caso siguiendo la transición más avanzada', () => {
    expect(estadoCaso({ respondidaEn: null, resueltaEn: null, cerradaEn: null })).toBe('ABIERTO');
    expect(estadoCaso({ respondidaEn: new Date(), resueltaEn: null, cerradaEn: null })).toBe('EN_ATENCION');
    expect(estadoCaso({ respondidaEn: new Date(), resueltaEn: new Date(), cerradaEn: null })).toBe('RESUELTO');
    expect(estadoCaso({ respondidaEn: null, resueltaEn: null, cerradaEn: new Date() })).toBe('CERRADO');
  });
});
