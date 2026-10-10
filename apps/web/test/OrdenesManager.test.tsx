import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdenesManager from '../src/features/ordenes/OrdenesManager';
import type { OrdenDetalle, OrdenResumen } from '../src/features/ordenes/ordenes.types';

const mocks = vi.hoisted(() => ({
    listarUbicaciones: vi.fn(),
    listarOrdenes: vi.fn(),
    crearOrden: vi.fn(),
    obtenerOrden: vi.fn(),
    cambiarEstadoOrden: vi.fn(),
}));

vi.mock('../src/features/equipos/equipos.api', () => ({ listarUbicaciones: mocks.listarUbicaciones }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({
    listarOrdenes: mocks.listarOrdenes,
    crearOrden: mocks.crearOrden,
    obtenerOrden: mocks.obtenerOrden,
    cambiarEstadoOrden: mocks.cambiarEstadoOrden,
}));

const orden: OrdenResumen = {
    id: 14, numero: '140', ubicacionId: 3, estadoCodigo: 'PENDIENTE',
    solicitud: 'Mantenimiento del aire acondicionado', prioridad: 'ALTA',
    fechaProgramada: null, creadaEn: '2026-10-09T20:00:00Z',
    actualizadaEn: '2026-10-09T20:00:00Z', cerradaEn: null, version: 1,
    clienteNombreRegistrado: 'Cliente de prueba', ubicacionNombreRegistrado: 'Casa principal',
    direccionRegistrada: 'Managua',
};
const detalle: OrdenDetalle = {
    ...orden, clienteIdentificacionRegistrada: null,
    creadaPor: { id: 9, identificador: 'administrador.trackon' },
    historial: [{ id: 1, estadoAnterior: null, estadoNuevo: 'PENDIENTE',
        motivo: 'Registro inicial de la orden.', fecha: '2026-10-09T20:00:00Z' }],
};

function pagina(items: OrdenResumen[] = [orden], hayMas = false) {
    return { items, hayMas, pagina: 1, limite: 25 };
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarOrdenes.mockResolvedValue(pagina());
    mocks.listarUbicaciones.mockResolvedValue([{
        id: 3, nombre: 'Casa principal', direccion: 'Managua', activa: true,
        cliente: { id: 2, codigo: 'CLI-002', persona: { firstName: 'Ana', firstLastName: 'López' }, organizacion: null },
    }]);
    mocks.crearOrden.mockResolvedValue(detalle);
    mocks.obtenerOrden.mockResolvedValue(detalle);
    mocks.cambiarEstadoOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'CANCELADA' });
});

afterEach(cleanup);

async function esperarListado() {
    await screen.findByText('OT-140');
}

function abrirAlta() {
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva orden' }));
}

describe('Gestión web de órdenes de trabajo', () => {
    it('lista órdenes al iniciar', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        expect(screen.getByText('Cliente de prueba')).toBeTruthy();
        expect(screen.getByText('ALTA')).toBeTruthy();
    });

    it('muestra un estado vacío', async () => {
        mocks.listarOrdenes.mockResolvedValue(pagina([]));
        render(<OrdenesManager />);
        expect(await screen.findByText('No hay órdenes para estos filtros.')).toBeTruthy();
    });

    it('informa errores de carga inicial', async () => {
        mocks.listarOrdenes.mockRejectedValue(new Error('Servidor fuera de servicio'));
        render(<OrdenesManager />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Servidor fuera de servicio');
    });

    it('filtra por cliente o solicitud y estado', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.change(screen.getByRole('textbox', { name: 'Buscar órdenes' }), { target: { value: 'motor' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar estado de orden' }), { target: { value: 'PENDIENTE' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith({
            estado: 'PENDIENTE', buscar: 'motor', pagina: 1, limite: 25,
        }));
    });

    it('permite abrir y cancelar el alta', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        expect(screen.getByText('Nueva orden de trabajo')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.getByText('OT-140')).toBeTruthy();
    });

    it('crea una orden desde el formulario', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Solicitud' }), { target: { value: 'Revisar el compresor' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Prioridad' }), { target: { value: 'URGENTE' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));
        await waitFor(() => expect(mocks.crearOrden).toHaveBeenCalledWith({
            ubicacionId: 3, solicitud: 'Revisar el compresor', prioridad: 'URGENTE', fechaProgramada: null,
        }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Orden OT-140 creada.');
    });

    it('muestra errores de creación y conserva el formulario', async () => {
        mocks.crearOrden.mockRejectedValue(new Error('Ubicación inactiva'));
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Solicitud' }), { target: { value: 'Revisar el compresor' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Ubicación inactiva');
        expect(screen.getByRole('textbox', { name: 'Solicitud' })).toBeTruthy();
    });

    it('abre detalle con historial de movimientos', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
        expect(await screen.findByText('Historial de estados')).toBeTruthy();
        expect(screen.getByText(/Registro inicial de la orden/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
        expect(screen.queryByText('Historial de estados')).toBeNull();
    });

    it('informa errores al consultar detalle', async () => {
        mocks.obtenerOrden.mockRejectedValue(new Error('No existe'));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No existe');
    });

    it('cambia el estado de una orden cuando está permitido', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
        await screen.findByText('Historial de estados');
        fireEvent.change(screen.getByRole('combobox', { name: 'Nuevo estado' }), { target: { value: 'CANCELADA' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo del cambio' }), { target: { value: 'Cancelación solicitada' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado' }));
        await waitFor(() => expect(mocks.cambiarEstadoOrden).toHaveBeenCalledWith(14, 'CANCELADA', 'Cancelación solicitada'));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Estado actualizado correctamente.');
    });

    it('muestra errores de cambio de estado', async () => {
        mocks.cambiarEstadoOrden.mockRejectedValue(new Error('Cambio no permitido'));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
        await screen.findByText('Historial de estados');
        fireEvent.change(screen.getByRole('combobox', { name: 'Nuevo estado' }), { target: { value: 'CANCELADA' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo del cambio' }), { target: { value: 'Cancelación solicitada' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Cambio no permitido');
    });

    it('respeta permisos de solo consulta para técnicos', async () => {
        render(<OrdenesManager puedeGestionar={false} />);
        await esperarListado();
        expect(screen.queryByRole('button', { name: '+ Nueva orden' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));
        await screen.findByText('Historial de estados');
        expect(screen.queryByRole('button', { name: 'Cambiar estado' })).toBeNull();
    });

    it('permite avanzar y retroceder páginas', async () => {
        mocks.listarOrdenes.mockResolvedValue(pagina([orden], true));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })));
        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1 })));
    });
});
