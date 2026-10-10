import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findFirstUbicacion: vi.fn(),
    createOrden: vi.fn(),
    findManyOrden: vi.fn(),
    findUniqueOrden: vi.fn(),
    findFirstAsignacion: vi.fn(),
    updateManyOrden: vi.fn(),
    createHistorial: vi.fn(),
    findUniqueOrThrowOrden: vi.fn(),
}));

vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: {
        ubicacion: { findFirst: mocks.findFirstUbicacion },
        ordenTrabajo: {
            create: mocks.createOrden,
            findMany: mocks.findManyOrden,
            findUnique: mocks.findUniqueOrden,
        },
        asignacion: { findFirst: mocks.findFirstAsignacion },
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
            ordenTrabajo: {
                updateMany: mocks.updateManyOrden,
                findUniqueOrThrow: mocks.findUniqueOrThrowOrden,
            },
            historialEstado: { create: mocks.createHistorial },
        }),
    },
}));

import * as repository from '../src/modules/ordenes/ordenes.repository.js';

const datos = { ubicacionId: 3, solicitud: 'Mantenimiento general', prioridad: 'MEDIA' as const };
const historicos = {
    clienteNombre: 'Empresa de prueba', clienteIdentificacion: '000',
    ubicacionNombre: 'Central', direccion: 'Managua',
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.findManyOrden.mockResolvedValue([{ id: 1, numero: 2n }]);
    mocks.updateManyOrden.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrowOrden.mockResolvedValue({ id: 1, numero: 2n });
    mocks.createHistorial.mockResolvedValue({ id: 1 });
});

describe('Persistencia de órdenes', () => {
    it('valida ubicación y cliente activo', async () => {
        await repository.buscarUbicacionActiva(3);
        expect(mocks.findFirstUbicacion).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 3, activa: true, cliente: { activo: true } } }),
        );
    });

    it('crea la orden y su historial inicial en una operación', async () => {
        await repository.crear(datos, 9, historicos);
        expect(mocks.createOrden).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                estadoCodigo: 'PENDIENTE', creadaPorId: 9,
                clienteNombreRegistrado: 'Empresa de prueba',
                historial: { create: expect.objectContaining({ cambiadoPorId: 9 }) },
            }),
        }));
    });

    it('convierte una fecha programada válida a Date', async () => {
        await repository.crear({ ...datos, fechaProgramada: '2026-10-10T12:00:00Z' }, 9, historicos);
        expect(mocks.createOrden.mock.calls[0]?.[0].data.fechaProgramada).toBeInstanceOf(Date);
    });

    it('lista paginada y filtra por estado y texto', async () => {
        const salida = await repository.listar({ pagina: 1, limite: 25, buscar: 'Cliente', estado: 'PENDIENTE' });
        expect(salida.items).toHaveLength(1);
        expect(mocks.findManyOrden).toHaveBeenCalledWith(expect.objectContaining({
            take: 26, skip: 0,
            where: expect.objectContaining({ estadoCodigo: 'PENDIENTE', OR: expect.any(Array) }),
        }));
    });

    it('detecta la página siguiente', async () => {
        mocks.findManyOrden.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
        const salida = await repository.listar({ pagina: 2, limite: 2 });
        expect(salida.items).toHaveLength(2);
        expect(salida.hayMas).toBe(true);
        expect(mocks.findManyOrden).toHaveBeenCalledWith(expect.objectContaining({ skip: 2, take: 3 }));
    });

    it('consulta una orden por identificador', async () => {
        await repository.buscarPorId(14);
        expect(mocks.findUniqueOrden).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 14 } }));
    });

    it('comprueba la asignación vigente', async () => {
        await repository.tieneAsignacionVigente(14);
        expect(mocks.findFirstAsignacion).toHaveBeenCalledWith(expect.objectContaining({
            where: { ordenId: 14, fin: null },
        }));
    });

    it('actualiza estado y registra historial de forma atómica', async () => {
        await repository.cambiarEstado(14, 'PENDIENTE', 'CANCELADA', 3, 'Cancelación', 9);
        expect(mocks.updateManyOrden).toHaveBeenCalledWith({
            where: { id: 14, estadoCodigo: 'PENDIENTE', version: 3 },
            data: { estadoCodigo: 'CANCELADA', version: { increment: 1 } },
        });
        expect(mocks.createHistorial).toHaveBeenCalledWith({
            data: { ordenId: 14, estadoAnterior: 'PENDIENTE', estadoNuevo: 'CANCELADA', motivo: 'Cancelación', cambiadoPorId: 9 },
        });
    });

    it('establece fecha de cierre al finalizar la orden', async () => {
        await repository.cambiarEstado(14, 'EN_REVISION', 'CERRADA', 3, 'Trabajo aprobado', 9);
        expect(mocks.updateManyOrden.mock.calls[0]?.[0].data.cerradaEn).toBeInstanceOf(Date);
    });

    it('rechaza versiones desactualizadas sin crear historial', async () => {
        mocks.updateManyOrden.mockResolvedValue({ count: 0 });
        await expect(repository.cambiarEstado(14, 'PENDIENTE', 'CANCELADA', 3, 'Cancelación', 9))
            .rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.createHistorial).not.toHaveBeenCalled();
    });
});
