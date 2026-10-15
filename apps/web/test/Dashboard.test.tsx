import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../src/features/dashboard/Dashboard';
import type { ResumenOperativo } from '../src/features/dashboard/dashboard.api';

const mocks = vi.hoisted(() => ({ obtenerResumen: vi.fn() }));
vi.mock('../src/features/dashboard/dashboard.api', () => ({ obtenerResumen: mocks.obtenerResumen }));

const resumen: ResumenOperativo = {
    fecha: '2026-10-14', zonaHoraria: 'America/Managua', abiertas: 5, pendientes: 2,
    enProceso: 1, enRevision: 1, cerradas: 8, programadasHoy: 3, cerradasHoy: 1, urgentes: 1,
    requierenAtencion: [{ id: 7, numero: '007', clienteNombreRegistrado: 'Clínica Central',
        estadoCodigo: 'EN_REVISION', fechaProgramada: null, solicitud: 'Revisar compresor', prioridad: 'URGENTE' }],
    proximas: [{ id: 8, numero: '008', clienteNombreRegistrado: 'Hotel Azul', estadoCodigo: 'ASIGNADA',
        fechaProgramada: '2026-10-14T15:00:00-06:00' }],
    cuadrillas: [{ id: 1, nombre: 'Cuadrilla Norte', ordenesActivas: 0 }, { id: 2, nombre: 'Cuadrilla Sur', ordenesActivas: 2 }],
};

beforeEach(() => { vi.resetAllMocks(); mocks.obtenerResumen.mockResolvedValue(resumen); });
afterEach(cleanup);

describe('Centro operativo', () => {
    it('presenta el resumen y abre las acciones operativas', async () => {
        const onOrden = vi.fn(); const onCuadrillas = vi.fn();
        render(<Dashboard onOrden={onOrden} onCuadrillas={onCuadrillas} />);
        expect(screen.getByText('Actualizando el centro operativo…')).toBeTruthy();
        await screen.findByText(/Clínica Central/);
        expect(screen.getByText('1 de 2 cuadrillas sin órdenes activas')).toBeTruthy();
        expect(screen.getByText(/Hotel Azul/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Ver cuadrillas' }));
        fireEvent.click(screen.getByRole('button', { name: 'Ver órdenes' }));
        expect(onOrden.mock.calls).toEqual([[7], [8], []]);
        expect(onCuadrillas).toHaveBeenCalledOnce();
    });

    it('muestra estados vacíos y permite actualizar', async () => {
        mocks.obtenerResumen.mockResolvedValue({ ...resumen, requierenAtencion: [], proximas: [], cuadrillas: [] });
        render(<Dashboard onOrden={vi.fn()} onCuadrillas={vi.fn()} />);
        await screen.findByText('Sin órdenes pendientes de atención');
        expect(screen.getByText('No hay más atenciones programadas para hoy.')).toBeTruthy();
        expect(screen.getByText('No hay cuadrillas activas.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        await waitFor(() => expect(mocks.obtenerResumen).toHaveBeenCalledTimes(2));
    });

    it('informa el error y reintenta la consulta', async () => {
        mocks.obtenerResumen.mockRejectedValueOnce(new Error('Resumen no disponible')).mockResolvedValueOnce(resumen);
        render(<Dashboard onOrden={vi.fn()} onCuadrillas={vi.fn()} />);
        expect(await screen.findByText('Resumen no disponible')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(await screen.findByText(/Clínica Central/)).toBeTruthy();
    });
});
