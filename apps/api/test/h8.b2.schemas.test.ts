import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: {} }));

import {
  cerrarCasoSchema, cerrarCorrectivaSchema, crearCorrectivaSchema, crearRetrabajoSchema,
  responderCasoSchema, resolverCasoSchema,
} from '../src/modules/fuentes-gerenciales/calidad/casos/casos.schema.js';
import { listarCorrectivasSchema } from '../src/modules/fuentes-gerenciales/calidad/correctivas/correctivas.schema.js';

describe('H8 B2 acciones de caso y correctivas', () => {
  it('parsea payloads de transición con fechas ISO y versionado', () => {
    expect(responderCasoSchema.parse({ version: 3, respondidaEn: '2026-04-02T10:00:00Z' })).toEqual({ version: 3, respondidaEn: '2026-04-02T10:00:00Z' });
    expect(resolverCasoSchema.parse({ version: 4, resueltaEn: '2026-04-03T10:00:00Z', resultado: 'PROCEDE', causaRaiz: 'Falla de sellado' }).resultado).toBe('PROCEDE');
    expect(cerrarCasoSchema.safeParse({ version: 4, cerradaEn: '2026-04-03T10:00:00Z', inesperado: true }).success).toBe(false);
    expect(cerrarCorrectivaSchema.parse({ version: 1, cerradaEn: '2026-04-04T10:00:00Z', resultado: 'Ajuste validado' }).version).toBe(1);
    expect(responderCasoSchema.safeParse({ version: 2_147_483_646, respondidaEn: '2026-04-02T10:00:00Z' }).success).toBe(true);
    expect(responderCasoSchema.safeParse({ version: 2_147_483_647, respondidaEn: '2026-04-02T10:00:00Z' }).success).toBe(false);
  });

  it('valida dependencias temporales de retrabajo y acción correctiva', () => {
    expect(crearRetrabajoSchema.parse({ referenciaTrabajo: ' rt-9 ', fechaEfectiva: '2026-04-02T10:00:00Z', motivo: '  Reemplazo  ' })).toMatchObject({ referenciaTrabajo: 'RT-9', motivo: 'Reemplazo' });
    expect(crearCorrectivaSchema.safeParse({ descripcion: 'Acción', responsableId: 4, creadaEn: '2026-04-04T10:00:00Z', venceEn: '2026-04-03T10:00:00Z' }).success).toBe(false);
    expect(crearCorrectivaSchema.parse({ descripcion: 'Acción', responsableId: 4, creadaEn: '2026-04-04T10:00:00Z', venceEn: '2026-04-04T10:00:00Z' }).responsableId).toBe(4);
  });

  it('normaliza filtros, filtra responsable por ID y deja el estado total como predeterminado', () => {
    expect(listarCorrectivasSchema.parse({ responsable: '12', q: ' sello ' })).toMatchObject({ responsable: 12, q: 'sello', estado: 'todas', pagina: 1, limite: 25 });
    expect(listarCorrectivasSchema.safeParse({ responsable: 'persona' }).success).toBe(false);
    expect(listarCorrectivasSchema.safeParse({ estado: 'pendientes' }).success).toBe(false);
  });
});
