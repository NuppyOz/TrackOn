import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Agenda from '../src/features/agenda/Agenda';
import type { OrdenResumen } from '../src/features/ordenes/ordenes.types';

const mocks = vi.hoisted(() => ({ listarOrdenes: vi.fn() }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: mocks.listarOrdenes }));

const base = (datos: Partial<OrdenResumen>): OrdenResumen => ({
    id: 1, numero: '001', ubicacionId: 1, estadoCodigo: 'ASIGNADA', solicitud: 'Mantenimiento',
    prioridad: 'MEDIA', fechaProgramada: '2026-10-14T14:00:00-06:00', creadaEn: '', actualizadaEn: '',
    cerradaEn: null, version: 1, clienteNombreRegistrado: 'Cliente Uno', ubicacionNombreRegistrado: 'Sucursal',
    direccionRegistrada: 'Managua', ...datos,
});

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarOrdenes.mockResolvedValue({ items: [
        base({ id: 2, numero: '002', fechaProgramada: '2026-10-14T16:00:00-06:00', asignaciones: [] }),
        base({ id: 1, numero: '001', fechaProgramada: '2026-10-14T08:00:00-06:00', asignaciones: [{ id: 1, inicio: '', motivo: '', cuadrilla: { id: 4, nombre: 'Equipo A' }, empleadoResponsable: null }] }),
    ], hayMas: true });
});
afterEach(cleanup);

describe('Agenda', () => {
    it('ordena las visitas, navega a la orden y pagina resultados', async () => {
        const onOrden = vi.fn(); render(<Agenda onOrden={onOrden} />);
        await screen.findByText(/OT-001/);
        const botones = screen.getAllByRole('button', { name: 'Gestionar orden' });
        fireEvent.click(botones[0]);
        expect(onOrden).toHaveBeenCalledWith(1);
        expect(screen.getByText(/Equipo A/)).toBeTruthy();
        expect(screen.getByText(/Sin cuadrilla asignada/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));
        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1 })));
    });

    it('cambia el día y actualiza la consulta', async () => {
        render(<Agenda onOrden={vi.fn()} />); await screen.findByText(/OT-001/);
        fireEvent.change(screen.getByLabelText('Día de atención'), { target: { value: '2026-10-20' } });
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-20', hasta: '2026-10-20' })));
        fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-19' })));
        fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        await waitFor(() => expect(mocks.listarOrdenes.mock.calls.length).toBeGreaterThan(3));
    });

    it('presenta estados vacío y de error', async () => {
        mocks.listarOrdenes.mockResolvedValueOnce({ items: [], hayMas: false });
        const { unmount } = render(<Agenda onOrden={vi.fn()} />);
        expect(await screen.findByText('No hay órdenes programadas para este día')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveProperty('disabled', true);
        unmount();
        mocks.listarOrdenes.mockRejectedValueOnce(new Error('Agenda no disponible'));
        render(<Agenda onOrden={vi.fn()} />);
        expect(await screen.findByText('Agenda no disponible')).toBeTruthy();
    });
});
