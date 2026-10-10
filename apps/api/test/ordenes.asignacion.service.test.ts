import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ registrarAsignacion: vi.fn(), buscarPorId: vi.fn() }));
vi.mock('../src/modules/ordenes/ordenes.asignacion.repository.js', () => ({ registrarAsignacion: mocks.registrarAsignacion }));
vi.mock('../src/modules/ordenes/ordenes.repository.js', () => ({ buscarPorId: mocks.buscarPorId }));

import { asignar } from '../src/modules/ordenes/ordenes.asignacion.service.js';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.registrarAsignacion.mockResolvedValue(undefined);
    mocks.buscarPorId.mockResolvedValue({ id: 8, numero: 80n, estadoCodigo: 'ASIGNADA' });
});

describe('Servicio de asignación de órdenes', () => {
    it('devuelve orden actualizada con número serializable', async () => {
        const input = { cuadrillaId: 4, motivo: 'Asignación inicial' };
        const salida = await asignar(8, input, 3);
        expect(salida.numero).toBe('80');
        expect(mocks.registrarAsignacion).toHaveBeenCalledWith(8, input, 3);
        expect(mocks.buscarPorId).toHaveBeenCalledWith(8);
    });

    it('mantiene los errores de persistencia', async () => {
        mocks.registrarAsignacion.mockRejectedValue(new Error('Error de base de datos'));
        await expect(asignar(8, { cuadrillaId: 4, motivo: 'Asignación' }, 3)).rejects.toThrow('Error de base de datos');
    });

    it('gestiona ausencia posterior de la orden', async () => {
        mocks.buscarPorId.mockResolvedValue(null);
        await expect(asignar(8, { cuadrillaId: 4, motivo: 'Asignación' }, 3)).rejects.toMatchObject({ statusCode: 404 });
    });
});
