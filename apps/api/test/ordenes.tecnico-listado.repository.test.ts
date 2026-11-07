import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: { ordenTrabajo: { findMany: mocks.findMany } },
}));

import { listar } from '../src/modules/ordenes/ordenes.repository.js';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.findMany.mockResolvedValue([]);
});

const filtros = { pagina: 1, limite: 10 };

describe('Filtrado de lectura de órdenes por rol', () => {
    it('exige asignación activa y estado operativo para un técnico', async () => {
        await listar(filtros, { id: 11, empleadoId: 19, rol: 'TEC' });
        const where = mocks.findMany.mock.calls[0][0].where;
        expect(where.AND).toEqual(expect.arrayContaining([
            { estadoCodigo: { in: ['ASIGNADA', 'EN_EJECUCION', 'EN_REVISION'] } },
            expect.objectContaining({ asignaciones: {
                some: expect.objectContaining({ fin: null }),
            } }),
        ]));
        expect(where.AND[1].asignaciones.some.OR).toEqual(expect.arrayContaining([
            { empleadoResponsableId: 19 },
            { tecnicos: { some: { empleadoId: 19 } } },
            { cuadrilla: { is: { miembros: { some: { empleadoId: 19, fin: null } } } } },
        ]));
    });

    it('no deja que el filtro CANCELADA quite el requisito de asignación', async () => {
        await listar({ ...filtros, estado: 'CANCELADA' }, { id: 11, empleadoId: 19, rol: 'TEC' });
        const where = mocks.findMany.mock.calls[0][0].where;
        expect(where.estadoCodigo).toBe('CANCELADA');
        expect(where.AND).toHaveLength(2);
    });

    it('permite a gerente consultar la lista sin la restricción técnica', async () => {
        await listar(filtros, { id: 12, empleadoId: 31, rol: 'GTE_OPE' });
        expect(mocks.findMany.mock.calls[0][0].where.AND).toBeUndefined();
    });
});
