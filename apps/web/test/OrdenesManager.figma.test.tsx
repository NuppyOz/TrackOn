import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdenesManager from '../src/features/ordenes/OrdenesManager';
import type { OrdenResumen } from '../src/features/ordenes/ordenes.types';

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
    id: 14,
    numero: '140',
    ubicacionId: 3,
    estadoCodigo: 'PENDIENTE',
    solicitud: 'Mantenimiento del aire acondicionado',
    prioridad: 'ALTA',
    fechaProgramada: null,
    creadaEn: '2026-10-09T20:00:00Z',
    actualizadaEn: '2026-10-09T20:00:00Z',
    cerradaEn: null,
    version: 1,
    clienteNombreRegistrado: 'Cliente de prueba',
    ubicacionNombreRegistrado: 'Casa principal',
    direccionRegistrada: 'Managua',
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarOrdenes.mockResolvedValue({ items: [orden], pagina: 1, limite: 25, hayMas: false });
    mocks.listarUbicaciones.mockResolvedValue([]);
});
afterEach(cleanup);

describe('Presentación de Órdenes según Figma y backend', () => {
    it('muestra las columnas operativas del diseño sin inventar datos de asignación', async () => {
        render(<OrdenesManager />);
        await screen.findByText('OT-140');
        expect(screen.getByRole('columnheader', { name: 'Cliente / servicio' })).toBeTruthy();
        expect(screen.getByRole('columnheader', { name: 'Asignación' })).toBeTruthy();
        expect(screen.getByRole('columnheader', { name: 'Programación' })).toBeTruthy();
        expect(screen.getByText('Sin asignar')).toBeTruthy();
        expect(screen.getByText('Sin programar')).toBeTruthy();
        expect(screen.getByText('ALTA')).toBeTruthy();
    });

    it('los filtros rápidos envían estados reales del backend', async () => {
        render(<OrdenesManager />);
        await screen.findByText('OT-140');
        fireEvent.click(screen.getByRole('button', { name: 'Asignadas' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith({
            buscar: '', estado: 'ASIGNADA', pagina: 1, limite: 25,
        }));
        expect(screen.getByRole('button', { name: 'Asignadas' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('mantiene los permisos para técnicos en la nueva interfaz', async () => {
        render(<OrdenesManager puedeGestionar={false} />);
        await screen.findByText('OT-140');
        expect(screen.queryByRole('button', { name: '+ Nueva orden' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeTruthy();
    });
});
