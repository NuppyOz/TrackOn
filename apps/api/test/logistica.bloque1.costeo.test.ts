import { describe, expect, it } from 'vitest';
import { costoPromedioMicro, decimalValor, nuevoSaldo, valorDevolucionNano, valorSalidaNano } from '../src/modules/fuentes-gerenciales/logistica/movimientos/costeo.js';
import { cantidadMil } from '../src/modules/fuentes-gerenciales/logistica/movimientos/costeo.js';

describe('R8 costeo logístico por enteros escalados', () => {
  it('acepta apertura cero y exige cantidad positiva en movimientos ordinarios', () => {
    expect(cantidadMil('0.000', true)).toBe(0n);
    expect(() => cantidadMil('0.000')).toThrow();
  });

  it('consume con prorrateo entero y gasta el residual exacto al vaciar', () => {
    expect(valorSalidaNano(3000n, 5000n, 2900n)).toBe(4833n);
    const parcial = nuevoSaldo(3000n, 5000n, -1, 2900n, 4833n);
    expect(parcial).toEqual({ cantidad: 100n, valor: 167n });
    expect(valorSalidaNano(parcial.cantidad, parcial.valor, parcial.cantidad)).toBe(167n);
    expect(nuevoSaldo(parcial.cantidad, parcial.valor, -1, 100n, 167n)).toEqual({ cantidad: 0n, valor: 0n });
  });

  it('redondea el costo promedio solo para mostrarlo y no usa ese promedio para salidas', () => {
    expect(costoPromedioMicro(3000n, 5000n)).toBe(2n);
    expect(decimalValor(167n)).toBe('0.000000167');
  });

  it('acota redondeos de devoluciones parciales y deja el residual al retorno final', () => {
    expect(valorDevolucionNano(7n, 4n, 4n, 4n, 1n)).toBe(0n);
    expect(valorDevolucionNano(7n, 4n, 4n, 4n, 3n)).toBe(0n);
  });
});
