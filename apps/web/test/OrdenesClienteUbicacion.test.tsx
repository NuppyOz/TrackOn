import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import OrdenesManager from '../src/features/ordenes/OrdenesManager';

const mocks = vi.hoisted(() => ({
    listarUbicaciones: vi.fn(),
    listarOrdenes: vi.fn(),
    crearOrden: vi.fn(),
    obtenerOrden: vi.fn(),
    cambiarEstadoOrden: vi.fn(),
    asignarOrden: vi.fn(),
}));

vi.mock('../src/features/equipos/equipos.api', () => ({ listarUbicaciones: mocks.listarUbicaciones }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({
    listarOrdenes: mocks.listarOrdenes,
    crearOrden: mocks.crearOrden,
    obtenerOrden: mocks.obtenerOrden,
    cambiarEstadoOrden: mocks.cambiarEstadoOrden,
    asignarOrden: mocks.asignarOrden,
}));

const ubicaciones = [
    {
        id: 11, nombre: 'Sucursal Managua', direccion: 'Bolonia, Managua', activa: true,
        cliente: { id: 1, codigo: 'CLI-001', activo: true,
            organizacion: { razonSocial: 'MULTICAS Cliente Uno', nombreComercial: null }, persona: null },
    },
    {
        id: 12, nombre: 'Sucursal Masaya', direccion: 'Centro, Masaya', activa: true,
        cliente: { id: 1, codigo: 'CLI-001', activo: true,
            organizacion: { razonSocial: 'MULTICAS Cliente Uno', nombreComercial: null }, persona: null },
    },
    {
        id: 21, nombre: 'Casa de Carlos', direccion: 'Carretera Norte', activa: true,
        cliente: { id: 2, codigo: 'CLI-002', activo: true,
            organizacion: null, persona: { firstName: 'Carlos', firstLastName: 'Rojas' } },
    },
];

async function abrirAlta() {
    render(<OrdenesManager />);
    await screen.findByText('No hay órdenes para estos filtros.');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva orden' }));
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarUbicaciones.mockResolvedValue(ubicaciones);
    mocks.listarOrdenes.mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false });
    mocks.crearOrden.mockResolvedValue({ id: 100, numero: '100' });
});

afterEach(cleanup);

describe('Cliente y ubicaciones del formulario de órdenes', () => {
    it('deshabilita Ubicación hasta elegir un cliente', async () => {
        await abrirAlta();
        expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveProperty('value', '');
        expect(screen.getByRole('combobox', { name: 'Ubicación' })).toHaveProperty('disabled', true);
    });

    it('muestra cada cliente una sola vez, aunque tenga varias ubicaciones', async () => {
        await abrirAlta();
        const opciones = within(screen.getByRole('combobox', { name: 'Cliente' })).getAllByRole('option');
        expect(opciones).toHaveLength(3); // placeholder y dos clientes
    });

    it('solo muestra las ubicaciones del cliente seleccionado', async () => {
        await abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '1' } });
        const opciones = within(screen.getByRole('combobox', { name: 'Ubicación' })).getAllByRole('option');
        expect(opciones).toHaveLength(3);
        expect(opciones.map(opcion => opcion.textContent).join(' ')).toContain('Sucursal Managua');
        expect(opciones.map(opcion => opcion.textContent).join(' ')).toContain('Sucursal Masaya');
        expect(opciones.map(opcion => opcion.textContent).join(' ')).not.toContain('Casa de Carlos');
    });

    it('limpia la ubicación anterior al cambiar de cliente', async () => {
        await abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '1' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '12' } });
        expect(screen.getByRole('combobox', { name: 'Ubicación' })).toHaveProperty('value', '12');
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '2' } });
        expect(screen.getByRole('combobox', { name: 'Ubicación' })).toHaveProperty('value', '');
        const opciones = within(screen.getByRole('combobox', { name: 'Ubicación' })).getAllByRole('option');
        expect(opciones).toHaveLength(2);
        expect(opciones[1]).toHaveProperty('value', '21');
    });

    it('registra la ubicación del cliente sin inventar un campo extra en la API', async () => {
        await abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '2' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '21' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Solicitud' }), {
            target: { value: 'Revisar aire acondicionado' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));
        await waitFor(() => expect(mocks.crearOrden).toHaveBeenCalledWith({
            ubicacionId: 21,
            solicitud: 'Revisar aire acondicionado',
            prioridad: 'MEDIA',
            fechaProgramada: null,
        }));
    });

    it('no permite registrar una orden cuando no hay ubicaciones disponibles', async () => {
        mocks.listarUbicaciones.mockResolvedValue([]);
        await abrirAlta();
        expect(screen.getByText(/No hay clientes con ubicaciones activas/)).toBeTruthy();
        expect(screen.getByRole('combobox', { name: 'Ubicación' })).toHaveProperty('disabled', true);
        expect(mocks.crearOrden).not.toHaveBeenCalled();
    });
});
