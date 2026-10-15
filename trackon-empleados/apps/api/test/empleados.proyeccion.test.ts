import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn() }));
vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: { empleado: { findMany: mocks.findMany, findUnique: mocks.findUnique } },
}));

import { listarEmpleados, buscarEmpleadoPorId } from '../src/modules/empleados/empleados.repository.js';

describe('Consultas de empleados para frontend', () => {
    it('incluye habilitadoComoTecnico en el listado', async () => {
        mocks.findMany.mockResolvedValue([]);
        await listarEmpleados();
        expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
            select: expect.objectContaining({ habilitadoComoTecnico: true }),
        }));
    });
    it('incluye habilitadoComoTecnico en el detalle', async () => {
        mocks.findUnique.mockResolvedValue(null);
        await buscarEmpleadoPorId(12);
        expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 12 }, select: expect.objectContaining({ habilitadoComoTecnico: true }),
        }));
    });
});
