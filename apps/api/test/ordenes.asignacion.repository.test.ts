import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findOrden: vi.fn(),
    findCuadrilla: vi.fn(),
    updateOrden: vi.fn(),
    createAsignacion: vi.fn(),
    createHistorial: vi.fn(),
}));

vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: {
        $transaction: (callback: (tx: unknown) => Promise<unknown>) => callback({
            ordenTrabajo: { findUnique: mocks.findOrden, updateMany: mocks.updateOrden },
            cuadrilla: { findFirst: mocks.findCuadrilla },
            asignacion: { create: mocks.createAsignacion },
            historialEstado: { create: mocks.createHistorial },
        }),
    },
}));

import { registrarAsignacion } from '../src/modules/ordenes/ordenes.asignacion.repository.js';

const datos = { cuadrillaId: 4, motivo: 'Programación de servicio' };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.findOrden.mockResolvedValue({ id: 8, estadoCodigo: 'PENDIENTE', version: 2 });
    mocks.findCuadrilla.mockResolvedValue({ id: 4, miembros: [{ empleadoId: 7 }] });
    mocks.updateOrden.mockResolvedValue({ count: 1 });
    mocks.createAsignacion.mockResolvedValue({ id: 20 });
    mocks.createHistorial.mockResolvedValue({ id: 21 });
});

describe('Transacción de asignación de órdenes', () => {
    it('registra responsable, transición e historial', async () => {
        await registrarAsignacion(8, datos, 3);
        expect(mocks.createAsignacion).toHaveBeenCalledWith({
            data: { ordenId: 8, cuadrillaId: 4, empleadoResponsableId: 7, asignadaPorId: 3, motivo: datos.motivo },
        });
        expect(mocks.updateOrden).toHaveBeenCalledWith({
            where: { id: 8, estadoCodigo: 'PENDIENTE', version: 2 },
            data: { estadoCodigo: 'ASIGNADA', version: { increment: 1 } },
        });
        expect(mocks.createHistorial).toHaveBeenCalledWith({ data: {
            ordenId: 8, estadoAnterior: 'PENDIENTE', estadoNuevo: 'ASIGNADA', cambiadoPorId: 3, motivo: datos.motivo,
        } });
    });

    it('rechaza orden inexistente', async () => {
        mocks.findOrden.mockResolvedValue(null);
        await expect(registrarAsignacion(8, datos, 3)).rejects.toMatchObject({ statusCode: 404 });
        expect(mocks.createAsignacion).not.toHaveBeenCalled();
    });

    it('rechaza estados que no sean pendientes', async () => {
        mocks.findOrden.mockResolvedValue({ id: 8, estadoCodigo: 'CERRADA', version: 2 });
        await expect(registrarAsignacion(8, datos, 3)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rechaza cuadrilla inactiva o inexistente', async () => {
        mocks.findCuadrilla.mockResolvedValue(null);
        await expect(registrarAsignacion(8, datos, 3)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rechaza cuadrilla sin líder técnico habilitado', async () => {
        mocks.findCuadrilla.mockResolvedValue({ id: 4, miembros: [] });
        await expect(registrarAsignacion(8, datos, 3)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('detecta una modificación simultánea', async () => {
        mocks.updateOrden.mockResolvedValue({ count: 0 });
        await expect(registrarAsignacion(8, datos, 3)).rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.createAsignacion).not.toHaveBeenCalled();
    });

    it('registra una nueva fecha programada cuando está indicada', async () => {
        await registrarAsignacion(8, { ...datos, fechaProgramada: '2026-10-12T14:30:00-06:00' }, 3);
        expect(mocks.updateOrden).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ fechaProgramada: new Date('2026-10-12T14:30:00-06:00') }),
        }));
    });
});
