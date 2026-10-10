import { describe, expect, it } from 'vitest';
import {
    cambiarEstadoOrdenSchema,
    crearOrdenSchema,
    listarOrdenesSchema,
    ordenParamsSchema,
} from '../src/modules/ordenes/ordenes.schema.js';

describe('Validaciones de órdenes de trabajo', () => {
    it('normaliza solicitud y establece prioridad media', () => {
        expect(crearOrdenSchema.parse({ ubicacionId: 1, solicitud: '  Revisar el equipo  ' })).toEqual({
            ubicacionId: 1, solicitud: 'Revisar el equipo', prioridad: 'MEDIA',
        });
    });

    it('admite prioridad urgente y una fecha ISO con zona', () => {
        const datos = crearOrdenSchema.parse({
            ubicacionId: 2, solicitud: 'Falla en compresor', prioridad: 'URGENTE',
            fechaProgramada: '2026-10-10T15:00:00.000Z',
        });
        expect(datos.prioridad).toBe('URGENTE');
    });

    it.each([
        { ubicacionId: 0, solicitud: 'Solicitud válida' },
        { ubicacionId: 1, solicitud: 'abc' },
        { ubicacionId: 1, solicitud: 'Solicitud válida', prioridad: 'CRITICA' },
        { ubicacionId: 1, solicitud: 'Solicitud válida', fechaProgramada: '10/10/2026' },
        { ubicacionId: 1, solicitud: 'Solicitud válida', admin: true },
    ])('rechaza entradas inválidas: %#', (datos) => {
        expect(crearOrdenSchema.safeParse(datos).success).toBe(false);
    });

    it('valida IDs y evita ceros y notación exponencial', () => {
        expect(ordenParamsSchema.parse({ id: '12' }).id).toBe(12);
        expect(ordenParamsSchema.safeParse({ id: '0' }).success).toBe(false);
        expect(ordenParamsSchema.safeParse({ id: '1e3' }).success).toBe(false);
    });

    it('aplica paginación acotada', () => {
        expect(listarOrdenesSchema.parse({})).toEqual({ pagina: 1, limite: 25 });
        expect(listarOrdenesSchema.parse({ pagina: '2', limite: '10', estado: 'PENDIENTE' })).toEqual({
            pagina: 2, limite: 10, estado: 'PENDIENTE',
        });
        expect(listarOrdenesSchema.safeParse({ limite: '101' }).success).toBe(false);
    });

    it('exige motivo para cambiar un estado', () => {
        expect(cambiarEstadoOrdenSchema.safeParse({ estado: 'CERRADA', motivo: '  ' }).success).toBe(false);
        expect(cambiarEstadoOrdenSchema.parse({ estado: 'CANCELADA', motivo: ' Cancelación solicitada ' })).toEqual({
            estado: 'CANCELADA', motivo: 'Cancelación solicitada',
        });
    });
});
