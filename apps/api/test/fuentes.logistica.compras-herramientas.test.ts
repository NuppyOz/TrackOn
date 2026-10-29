import { describe, expect, it } from 'vitest';
import { crearCompraSchema, recibirLineaSchema } from '../src/modules/fuentes-gerenciales/logistica/compras/compras.schema.js';
import { crearHerramientaSchema, prestarHerramientaSchema, devolverPrestamoSchema } from '../src/modules/fuentes-gerenciales/logistica/herramientas/herramientas.schema.js';

const fecha = '2026-10-20T12:00:00.000Z';

describe('H7 logística bloque 2: contratos de compras y herramientas', () => {
  it('normaliza proveedor/referencias y valida cantidades/costos sin convertir precisión a Number', () => {
    const compra = crearCompraSchema.parse({
      proveedor: '  proveedor norte  ', referencia: '  oc-2026-4 ', fechaEfectiva: fecha,
      lineas: [{ articuloId: 7, cantidad: '999999999.999', costoUnitario: '9999999999.999999', prometidaEn: fecha }],
    });
    expect(compra).toMatchObject({ proveedor: 'PROVEEDOR NORTE', referencia: 'OC-2026-4', lineas: [{ cantidad: '999999999.999', costoUnitario: '9999999999.999999' }] });
    expect(crearCompraSchema.safeParse({ ...compra, lineas: [...compra.lineas, compra.lineas[0]] }).success).toBe(false);
    expect(crearCompraSchema.safeParse({ ...compra, lineas: [{ ...compra.lineas[0], cantidad: '1000000000.000' }] }).success).toBe(false);
    expect(recibirLineaSchema.safeParse({ version: 1, referencia: 'r-1', fechaEfectiva: fecha, cantidad: '0.000' }).success).toBe(false);
  });

  it('rechaza payloads desconocidos y fechas de préstamo inconsistentes', () => {
    expect(crearHerramientaSchema.parse({ codigo: '  tal-01 ', nombre: 'Taladro 1' })).toEqual({ codigo: 'TAL-01', nombre: 'Taladro 1' });
    expect(crearHerramientaSchema.safeParse({ codigo: 'TAL-01', nombre: 'Taladro', costo: 8 }).success).toBe(false);
    expect(prestarHerramientaSchema.safeParse({ empleadoId: 1, referencia: 'prest-1', prestadaEn: fecha, previstaEn: '2026-10-19T12:00:00.000Z' }).success).toBe(false);
    expect(devolverPrestamoSchema.safeParse({ devueltaEn: fecha, datoPersonal: 'documento' }).success).toBe(false);
  });
});
