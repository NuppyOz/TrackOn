import { describe, expect, it } from 'vitest';
import {
    calcularLineaCotizacion,
    accionesPermitidasCotizacion,
    decidirCotizacion,
    asegurarBorradorEditable,
    ErrorDominioCotizacion,
    estadoEfectivoCotizacion,
    enviarCotizacion,
    parseCantidad3,
    parseDecimal2,
    sumarTotalesCotizacion,
} from '../src/modules/comercial/cotizaciones/domain/index.js';

const instante = new Date('2026-10-20T12:00:00.000Z');
const reloj = { ahora: () => new Date(instante) };

describe('BE05 dominio puro de cotizaciones', () => {
    it('calcula subtotal y total con enteros escalados y redondeo mitad arriba', () => {
        const linea = calcularLineaCotizacion({ cantidad: '1.005', precio: '1.00', descuento: '0.01' });
        expect(linea).toEqual({ cantidad: '1.005', precio: '1.00', descuento: '0.01', subtotal: '1.01', total: '1.00' });
        expect(sumarTotalesCotizacion([linea.total, '2.00'])).toBe('3.00');
    });

    it('rechaza exponentes, escalas excesivas, cantidad cero y descuento mayor al subtotal', () => {
        expect(() => parseCantidad3('1e2')).toThrow(ErrorDominioCotizacion);
        expect(() => parseCantidad3('1.0001')).toThrow(ErrorDominioCotizacion);
        expect(() => parseCantidad3('0')).toThrow(ErrorDominioCotizacion);
        expect(() => parseDecimal2('1.001')).toThrow(ErrorDominioCotizacion);
        expect(() => parseCantidad3('1000000000')).toThrowError(expect.objectContaining({ codigo: 'DECIMAL_FUERA_DE_RANGO' }));
        expect(() => parseDecimal2('100000000000000.00')).toThrowError(expect.objectContaining({ codigo: 'DECIMAL_FUERA_DE_RANGO' }));
        expect(() => calcularLineaCotizacion({ cantidad: '1', precio: '1.00', descuento: '1.01' })).toThrowError(
            expect.objectContaining({ codigo: 'DESCUENTO_SUPERA_SUBTOTAL' }),
        );
    });

    it('rechaza desbordamiento de subtotal y total, y más de 100 líneas', () => {
        expect(() => calcularLineaCotizacion({ cantidad: '999999999.999', precio: '99999999999999.99', descuento: '0' }))
            .toThrowError(expect.objectContaining({ codigo: 'DECIMAL_FUERA_DE_RANGO' }));
        expect(() => sumarTotalesCotizacion(Array(100).fill('99999999999999.99')))
            .toThrowError(expect.objectContaining({ campo: 'total' }));
        expect(() => sumarTotalesCotizacion(Array(101).fill('0.00')))
            .toThrowError(expect.objectContaining({ codigo: 'DEMASIADAS_LINEAS' }));
    });

    it('envía solo borradores y reconoce el vencimiento en el instante exacto', () => {
        const datosEnvio = { venceEn: '2026-10-20T12:00:00.001Z', numeroLineas: 1, clienteActivo: true };
        expect(enviarCotizacion('BORRADOR', datosEnvio, reloj)).toEqual({ estadoPersistido: 'ENVIADA', enviadaEn: instante });
        expect(() => enviarCotizacion('ENVIADA', datosEnvio, reloj)).toThrowError(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
        expect(estadoEfectivoCotizacion('ENVIADA', instante, reloj)).toBe('VENCIDA');
        expect(estadoEfectivoCotizacion('ENVIADA', '2026-10-20T12:00:00.001Z', reloj)).toBe('ENVIADA');
    });

    it('valida vencimiento, líneas y cliente activo al enviar', () => {
        const base = { venceEn: '2026-10-20T12:00:00.001Z', numeroLineas: 1, clienteActivo: true };
        expect(() => enviarCotizacion('BORRADOR', { ...base, venceEn: instante }, reloj))
            .toThrowError(expect.objectContaining({ codigo: 'VENCIMIENTO_NO_FUTURO' }));
        expect(() => enviarCotizacion('BORRADOR', { ...base, venceEn: 'fecha' }, reloj))
            .toThrowError(expect.objectContaining({ codigo: 'FECHA_INVALIDA' }));
        expect(() => enviarCotizacion('BORRADOR', { ...base, numeroLineas: 0 }, reloj))
            .toThrowError(expect.objectContaining({ codigo: 'CANTIDAD_LINEAS_INVALIDA' }));
        expect(() => enviarCotizacion('BORRADOR', { ...base, clienteActivo: false }, reloj))
            .toThrowError(expect.objectContaining({ codigo: 'CLIENTE_INACTIVO' }));
    });

    it.each(['APROBADA', 'RECHAZADA'] as const)('decide como %s solo antes del vencimiento', decision => {
        expect(decidirCotizacion('ENVIADA', '2026-10-20T12:00:00.001Z', decision, reloj).estadoPersistido).toBe(decision);
        expect(() => decidirCotizacion('ENVIADA', instante, decision, reloj)).toThrowError(
            expect.objectContaining({ codigo: 'COTIZACION_VENCIDA' }),
        );
    });

    it('deniega decisiones en borrador o estado final y edición fuera de borrador', () => {
        expect(() => decidirCotizacion('BORRADOR', '2026-10-21T00:00:00Z', 'APROBADA', reloj))
            .toThrowError(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
        expect(() => decidirCotizacion('APROBADA', '2026-10-21T00:00:00Z', 'RECHAZADA', reloj))
            .toThrowError(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
        expect(() => asegurarBorradorEditable('ENVIADA')).toThrowError(expect.objectContaining({ codigo: 'TRANSICION_INVALIDA' }));
        expect(() => asegurarBorradorEditable('BORRADOR')).not.toThrow();
    });

    it('usa el mismo instante del reloj para validar y registrar la decisión', () => {
        let lecturas = 0;
        const relojQueAvanza = { ahora: () => {
            lecturas += 1;
            return new Date(lecturas === 1 ? '2026-10-20T12:00:00.000Z' : '2026-10-20T12:00:00.002Z');
        } };
        const resultado = decidirCotizacion('ENVIADA', '2026-10-20T12:00:00.001Z', 'APROBADA', relojQueAvanza);
        expect(resultado.decididaEn.toISOString()).toBe('2026-10-20T12:00:00.000Z');
        expect(lecturas).toBe(1);
    });

    it('expone acciones según estado efectivo', () => {
        expect(accionesPermitidasCotizacion('BORRADOR', '2026-10-21T00:00:00Z', reloj)).toEqual({ editar: true, enviar: true, decidir: false });
        expect(accionesPermitidasCotizacion('ENVIADA', '2026-10-20T12:00:00.001Z', reloj)).toEqual({ editar: false, enviar: false, decidir: true });
        expect(accionesPermitidasCotizacion('ENVIADA', instante, reloj)).toEqual({ editar: false, enviar: false, decidir: false });
        expect(accionesPermitidasCotizacion('RECHAZADA', instante, reloj)).toEqual({ editar: false, enviar: false, decidir: false });
    });
});
