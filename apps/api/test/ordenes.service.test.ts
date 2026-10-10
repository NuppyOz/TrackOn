import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    buscarUbicacionActiva: vi.fn(),
    crear: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    tieneAsignacionVigente: vi.fn(),
    cambiarEstado: vi.fn(),
}));

vi.mock('../src/modules/ordenes/ordenes.repository.js', () => mocks);

import * as service from '../src/modules/ordenes/ordenes.service.js';

const orden = {
    id: 14,
    numero: 140n,
    estadoCodigo: 'PENDIENTE',
    version: 1,
    solicitud: 'Servicio de mantenimiento',
};

const datos = { ubicacionId: 3, solicitud: 'Servicio de mantenimiento', prioridad: 'MEDIA' as const };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.buscarUbicacionActiva.mockResolvedValue({
        id: 3, nombre: 'Sucursal Norte', direccion: 'Managua',
        cliente: { persona: { firstName: 'Ana', firstLastName: 'López', numberDocument: '001-TEST' }, organizacion: null },
    });
    mocks.crear.mockResolvedValue(orden);
    mocks.listar.mockResolvedValue({ items: [orden], pagina: 1, limite: 25, hayMas: false });
    mocks.buscarPorId.mockResolvedValue(orden);
    mocks.tieneAsignacionVigente.mockResolvedValue({ id: 2 });
    mocks.cambiarEstado.mockResolvedValue({ ...orden, estadoCodigo: 'CANCELADA', version: 2 });
});

describe('Reglas de negocio de órdenes', () => {
    it('crea una orden con los datos históricos del cliente natural', async () => {
        const resultado = await service.crear(datos, 9);
        expect(resultado.numero).toBe('140');
        expect(mocks.crear).toHaveBeenCalledWith(datos, 9, {
            clienteNombre: 'Ana López', clienteIdentificacion: '001-TEST',
            ubicacionNombre: 'Sucursal Norte', direccion: 'Managua',
        });
    });

    it('usa los datos de la organización cuando el cliente es jurídico', async () => {
        mocks.buscarUbicacionActiva.mockResolvedValue({
            nombre: 'Planta', direccion: 'Carretera Norte',
            cliente: { persona: null, organizacion: { razonSocial: 'MULTICAS S.A.', identificacionTributaria: 'J000' } },
        });
        await service.crear(datos, 9);
        expect(mocks.crear).toHaveBeenCalledWith(datos, 9, expect.objectContaining({
            clienteNombre: 'MULTICAS S.A.', clienteIdentificacion: 'J000',
        }));
    });

    it('rechaza ubicaciones inexistentes o inactivas', async () => {
        mocks.buscarUbicacionActiva.mockResolvedValue(null);
        await expect(service.crear(datos, 9)).rejects.toMatchObject({ statusCode: 400 });
        expect(mocks.crear).not.toHaveBeenCalled();
    });

    it('rechaza clientes sin nombre identificable', async () => {
        mocks.buscarUbicacionActiva.mockResolvedValue({
            nombre: 'Sede', direccion: 'Managua', cliente: { persona: null, organizacion: null },
        });
        await expect(service.crear(datos, 9)).rejects.toMatchObject({ statusCode: 409 });
    });

    it('normaliza los números BigInt de la página', async () => {
        const respuesta = await service.listar({ pagina: 1, limite: 25 });
        expect(respuesta.items[0]?.numero).toBe('140');
        expect(respuesta.hayMas).toBe(false);
    });

    it('consulta el detalle y serializa el número', async () => {
        expect((await service.obtener(14)).numero).toBe('140');
        expect(mocks.buscarPorId).toHaveBeenCalledWith(14);
    });

    it('retorna 404 al consultar una orden inexistente', async () => {
        mocks.buscarPorId.mockResolvedValue(null);
        await expect(service.obtener(2)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('registra una transición válida con versión y usuario', async () => {
        const salida = await service.cambiarEstado(14, { estado: 'CANCELADA', motivo: 'Solicitud del cliente' }, 9);
        expect(salida.numero).toBe('140');
        expect(mocks.cambiarEstado).toHaveBeenCalledWith(14, 'PENDIENTE', 'CANCELADA', 1, 'Solicitud del cliente', 9);
    });

    it('rechaza transiciones no autorizadas', async () => {
        await expect(service.cambiarEstado(14, { estado: 'CERRADA', motivo: 'Cierre prematuro' }, 9))
            .rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.cambiarEstado).not.toHaveBeenCalled();
    });

    it('exige asignación vigente antes de marcar la orden como ASIGNADA', async () => {
        mocks.tieneAsignacionVigente.mockResolvedValue(null);
        await expect(service.cambiarEstado(14, { estado: 'ASIGNADA', motivo: 'Nueva cuadrilla' }, 9))
            .rejects.toMatchObject({ statusCode: 409 });
    });

    it('permite ASIGNADA con responsable vigente', async () => {
        await service.cambiarEstado(14, { estado: 'ASIGNADA', motivo: 'Cuadrilla programada' }, 9);
        expect(mocks.cambiarEstado).toHaveBeenCalledOnce();
    });

    it('rechaza cambios cuando la orden no existe', async () => {
        mocks.buscarPorId.mockResolvedValue(null);
        await expect(service.cambiarEstado(14, { estado: 'CANCELADA', motivo: 'Cancelación solicitada' }, 9))
            .rejects.toMatchObject({ statusCode: 404 });
    });

    it('no permite cambiar órdenes cerradas', async () => {
        mocks.buscarPorId.mockResolvedValue({ ...orden, estadoCodigo: 'CERRADA' });
        await expect(service.cambiarEstado(14, { estado: 'PENDIENTE', motivo: 'Reabrir sin permiso' }, 9))
            .rejects.toMatchObject({ statusCode: 409 });
    });
});
