import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() }));
vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: { empleado: { findMany: mocks.findMany, findUnique: mocks.findUnique, count: mocks.count } },
}));

import { listarEmpleados, buscarEmpleadoPorId } from '../src/modules/empleados/empleados.repository.js';

describe('Consultas de empleados para frontend', () => {
    it('incluye habilitadoComoTecnico en el listado', async () => {
        mocks.findMany.mockResolvedValue([]);
        mocks.count.mockResolvedValue(0);
        await listarEmpleados({ buscar: '', estado: 'todos', tecnico: 'todos', pagina: 1, limite: 25 });
        expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
            select: expect.objectContaining({ habilitadoComoTecnico: true }),
            skip: 0,
            take: 26,
        }));
    });
    it('aplica filtros y devuelve metadatos para el frontend', async () => {
        mocks.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
        mocks.count.mockResolvedValueOnce(2).mockResolvedValueOnce(7).mockResolvedValueOnce(5).mockResolvedValueOnce(3);
        const resultado = await listarEmpleados({ buscar: 'ana', estado: 'activos', tecnico: 'habilitados', pagina: 2, limite: 1 });
        expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 1, take: 2,
            where: expect.objectContaining({ active: true, habilitadoComoTecnico: true, OR: expect.any(Array) }) }));
        expect(resultado).toEqual({ items: [{ id: 1 }], pagina: 2, limite: 1, hayMas: true, total: 2,
            resumen: { total: 7, activos: 5, tecnicosHabilitados: 3 } });
    });
    it('incluye habilitadoComoTecnico en el detalle', async () => {
        mocks.findUnique.mockResolvedValue(null);
        await buscarEmpleadoPorId(12);
        expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 12 }, select: expect.objectContaining({ habilitadoComoTecnico: true }),
        }));
    });
});
