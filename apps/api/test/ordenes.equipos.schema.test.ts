import { describe, expect, it } from 'vitest';
import {
    agregarEquipoOrdenSchema,
    diagnosticoParamsSchema,
    registrarDiagnosticoSchema,
} from '../src/modules/ordenes/ordenes.equipos.schema.js';

describe('Validaciones de equipos intervenidos', () => {
    it('acepta equipo existente y evita campos ajenos', () => {
        expect(agregarEquipoOrdenSchema.parse({ equipoId: 12 })).toEqual({ equipoId: 12 });
        expect(() => agregarEquipoOrdenSchema.parse({ equipoId: 12, ubicacionId: 99 })).toThrow();
    });
    it('rechaza ID inválido, cero y negativo', () => {
        for (const id of [0, -1, 1.5, '7', 2147483648]) {
            expect(agregarEquipoOrdenSchema.safeParse({ equipoId: id }).success).toBe(false);
        }
    });
    it('reconoce parámetros del diagnóstico', () => {
        expect(diagnosticoParamsSchema.parse({ id: '2', registroId: '5' })).toEqual({ id: 2, registroId: 5 });
        expect(diagnosticoParamsSchema.safeParse({ id: 'x', registroId: '5' }).success).toBe(false);
    });
    it('recorta textos y permite observaciones nulas', () => {
        expect(registrarDiagnosticoSchema.parse({ diagnostico: '  Falla de compresor detectada  ', observaciones: null }))
            .toEqual({ diagnostico: 'Falla de compresor detectada', observaciones: null });
    });
    it('exige diagnóstico mínimo y no admite datos imprevistos', () => {
        expect(registrarDiagnosticoSchema.safeParse({ diagnostico: 'corto' }).success).toBe(false);
        expect(registrarDiagnosticoSchema.safeParse({ diagnostico: 'Prueba técnica completa', tiempo: 999 }).success).toBe(false);
    });
});
