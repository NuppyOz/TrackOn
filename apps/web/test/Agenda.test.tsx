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
    vi.useFakeTimers({ now: new Date('2026-10-14T15:00:00-06:00'), toFake: ['Date'] });
    mocks.listarOrdenes.mockResolvedValue({ items: [
        base({ id: 2, numero: '002', fechaProgramada: '2026-10-14T16:00:00-06:00', asignaciones: [] }),
        base({ id: 1, numero: '001', fechaProgramada: '2026-10-14T08:00:00-06:00', asignaciones: [{ id: 1, inicio: '', motivo: '', cuadrilla: { id: 4, nombre: 'Equipo A' }, empleadoResponsable: null }] }),
    ], hayMas: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Agenda', () => {
    it('consulta la semana completa, ordena las visitas del día y abre la orden', async () => {
        const onOrden = vi.fn(); render(<Agenda onOrden={onOrden} />);
        await screen.findByText(/OT-001/);
        expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-12', hasta: '2026-10-18', limite: 100 }));
        const eventos = screen.getAllByRole('button', { name: /Gestionar orden/ });
        expect(eventos[0].textContent).toContain('OT-001');
        fireEvent.click(eventos[0]);
        expect(onOrden).toHaveBeenCalledWith(1);
        expect(screen.getByText(/Equipo A/)).toBeTruthy();
        expect(screen.getByText(/Sin cuadrilla asignada/)).toBeTruthy();
    });

    it('navega por semanas y salta a una fecha', async () => {
        render(<Agenda onOrden={vi.fn()} />); await screen.findByText(/OT-001/);
        fireEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-19', hasta: '2026-10-25' })));
        fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-12' })));
        fireEvent.change(screen.getByLabelText('Ir a la fecha'), { target: { value: '2026-11-05' } });
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-11-02', hasta: '2026-11-08' })));
        fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ desde: '2026-10-12' })));
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        await waitFor(() => expect(mocks.listarOrdenes.mock.calls.length).toBeGreaterThan(4));
    });

    it('presenta estados vacío y de error', async () => {
        mocks.listarOrdenes.mockResolvedValueOnce({ items: [], hayMas: false });
        const { unmount } = render(<Agenda onOrden={vi.fn()} />);
        expect(await screen.findByText('No hay órdenes programadas esta semana')).toBeTruthy();
        unmount();
        mocks.listarOrdenes.mockRejectedValueOnce(new Error('Agenda no disponible'));
        render(<Agenda onOrden={vi.fn()} />);
        expect(await screen.findByText('Agenda no disponible')).toBeTruthy();
    });
});
