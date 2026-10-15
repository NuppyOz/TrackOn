import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));
import { asignarOrden } from '../src/features/ordenes/ordenes.api';

beforeEach(() => vi.resetAllMocks());

describe('Cliente HTTP de asignaciones', () => {
    it('utiliza la ruta correcta y el cuerpo JSON', async () => {
        mocks.api.mockResolvedValue({ id: 8, estadoCodigo: 'ASIGNADA' });
        await asignarOrden(8, { cuadrillaId: 4, motivo: 'Orden programada' });
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/8/asignacion', {
            method: 'POST', body: JSON.stringify({ cuadrillaId: 4, motivo: 'Orden programada' }),
        });
    });

    it('propaga errores para permitir su visualización', async () => {
        mocks.api.mockRejectedValue(new Error('Sin permiso'));
        await expect(asignarOrden(8, { cuadrillaId: 4, motivo: 'Orden programada' })).rejects.toThrow('Sin permiso');
    });
});
