import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    listarVinculados: vi.fn(), disponibles: vi.fn(), vincular: vi.fn(), guardarDiagnostico: vi.fn(),
}));
vi.mock('../src/modules/ordenes/ordenes.equipos.repository.js', () => mocks);

import * as service from '../src/modules/ordenes/ordenes.equipos.service.js';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarVinculados.mockResolvedValue([]);
    mocks.disponibles.mockResolvedValue([]);
    mocks.vincular.mockResolvedValue({ id: 10 });
    mocks.guardarDiagnostico.mockResolvedValue({ id: 10, diagnostico: 'Falla eléctrica' });
});

describe('Servicio de equipos de OT', () => {
    it('expone consultas sin modificar datos', async () => {
        expect(await service.listar(2)).toEqual([]);
        expect(await service.listarDisponibles(2)).toEqual([]);
        expect(mocks.disponibles).toHaveBeenCalledWith(2);
    });
    it('devuelve el vínculo y el diagnóstico cuando hay éxito', async () => {
        expect(await service.vincular(2, 3)).toEqual({ id: 10 });
        const actor = { id: 4, empleadoId: 8, rol: 'ADMIN' };
        const datos = { diagnostico: 'Problema de válvula termostática' };
        await service.registrarDiagnostico(2, 10, datos, actor);
        expect(mocks.guardarDiagnostico).toHaveBeenCalledWith(2, 10, datos, actor);
    });
    it('propaga errores de negocio sin reemplazarlos', async () => {
        const fallo = new Error('Ubicación incorrecta');
        mocks.vincular.mockRejectedValue(fallo);
        await expect(service.vincular(2, 3)).rejects.toBe(fallo);
    });
    it('convierte la colisión serializable de Prisma a HTTP 409', async () => {
        const error = new Prisma.PrismaClientKnownRequestError('Conflicto de transacción', {
            code: 'P2034', clientVersion: '7.10.0',
        });
        mocks.vincular.mockRejectedValue(error);
        await expect(service.vincular(2, 3)).rejects.toMatchObject({ statusCode: 409 });
        mocks.guardarDiagnostico.mockRejectedValue(error);
        await expect(service.registrarDiagnostico(2, 10, { diagnostico: 'Prueba suficiente' }, {
            id: 4, empleadoId: 8, rol: 'ADMIN',
        })).rejects.toMatchObject({ statusCode: 409 });
    });
});
