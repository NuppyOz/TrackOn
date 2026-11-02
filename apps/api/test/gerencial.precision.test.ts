import { describe, expect, it } from 'vitest';
import { centavos, costoMicro, decimalFijo, dividirRedondeado, milesimas, porcentaje, valorNano } from '../src/modules/fuentes-gerenciales/contracts/precision.js';

describe('Precisión de registros y cálculos gerenciales', () => {
    it('preserva centavos por encima del entero seguro de JavaScript', () => {
        expect(centavos('90071992547409.93')).toBe(9007199254740993n);
        expect(decimalFijo(centavos('99999999999999.99'), 2)).toBe('99999999999999.99');
        expect(decimalFijo(-9007199254740993n, 2)).toBe('-90071992547409.93');
    });
    it('rechaza precisión sobrante, exponentes, negativos y cantidades nulas', () => {
        for (const value of ['1.001', '1e2', '-1', '01', '100000000000000.00']) expect(() => centavos(value)).toThrow();
        expect(() => milesimas('0.000')).toThrow();
        expect(milesimas('999999999.999')).toBe(999999999999n);
    });
    it('mantiene independientes escala comercial, costo y valor de inventario', () => {
        expect(costoMicro('0.000002')).toBe(2n);
        expect(valorNano('0.000000167')).toBe(167n);
        expect(decimalFijo(valorNano('0.000000167'), 9)).toBe('0.000000167');
    });
    it('redondea sin float con mitades simétricas y denominadores impares', () => {
        expect(dividirRedondeado(5n, 2n)).toBe(3n);
        expect(dividirRedondeado(-5n, 2n)).toBe(-3n);
        expect(dividirRedondeado(1n, 3n)).toBe(0n);
        expect(dividirRedondeado(2n, 3n)).toBe(1n);
        expect(() => dividirRedondeado(1n, 0n)).toThrow();
    });
    it('distingue cero calculado de una tasa sin base', () => {
        expect(porcentaje(0n, 3n)).toBe('0.00');
        expect(porcentaje(1n, 3n)).toBe('33.33');
        expect(porcentaje(2n, 3n)).toBe('66.67');
        expect(porcentaje(-1n, 3n)).toBe('-33.33');
        expect(porcentaje(1n, 0n)).toBeNull();
    });
});
