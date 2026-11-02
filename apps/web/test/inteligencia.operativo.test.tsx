import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import OperacionInteligentePage from '../src/features/inteligencia/operativo/OperacionInteligentePage';

const mocks = vi.hoisted(() => ({ obtenerResumen: vi.fn(), listarOrdenes: vi.fn(), irA: vi.fn() }));
vi.mock('../src/features/dashboard/dashboard.api', () => ({ obtenerResumen: mocks.obtenerResumen }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: mocks.listarOrdenes }));
vi.mock('../src/shared/navigation', () => ({ irA: mocks.irA }));

const orden = { id: 3, numero: '003', ubicacionId: 1, estadoCodigo: 'ASIGNADA', solicitud: 'Instalar unidad', prioridad: 'MEDIA',
    fechaProgramada: '2026-10-21T14:00:00-06:00', creadaEn: '', actualizadaEn: '', cerradaEn: null, version: 1,
    clienteNombreRegistrado: 'Cliente Norte', ubicacionNombreRegistrado: 'Sucursal', direccionRegistrada: 'Managua' };
const resumen = { fecha: '2026-10-20', zonaHoraria: 'America/Managua', abiertas: 4, pendientes: 1, enProceso: 1, enRevision: 1,
    cerradas: 8, programadasHoy: 2, cerradasHoy: 1, urgentes: 1, porEstado: { PENDIENTE: 1, ASIGNADA: 2, EN_EJECUCION: 1, CERRADA: 8 },
    requierenAtencion: [orden], proximas: [orden], cuadrillas: [] };

beforeEach(() => { vi.resetAllMocks(); mocks.obtenerResumen.mockResolvedValue(resumen); mocks.listarOrdenes.mockResolvedValue({ items: [orden], hayMas: false }); });
afterEach(cleanup);

describe('Información operativa', () => {
    it('presenta el resumen ejecutivo con datos reales y abre la orden', async () => {
        const onOrden = vi.fn(); render(<OperacionInteligentePage ruta="/inteligencia/operacion/resumen" onOrden={onOrden} />);
        expect(await screen.findByText('Órdenes activas')).toBeTruthy();
        expect(screen.getByText('4')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
        expect(onOrden).toHaveBeenCalledWith(3);
    });
    it('usa nombres simples y navega al seguimiento', async () => {
        render(<OperacionInteligentePage ruta="/inteligencia/operacion/indicadores" onOrden={vi.fn()} />);
        expect(await screen.findByText('Órdenes por estado')).toBeTruthy();
        expect(screen.queryByText(/H\.2|H\.3/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Seguimiento' }));
        expect(mocks.irA).toHaveBeenCalledWith('/inteligencia/operacion/seguimiento');
    });
});
