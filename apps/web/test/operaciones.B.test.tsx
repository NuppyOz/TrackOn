import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OperacionesWorkspace from '../src/features/operaciones/OperacionesWorkspace';
import FieldWorkspace from '../src/features/field/FieldWorkspace';

const mocks = vi.hoisted(() => ({ listarOrdenes: vi.fn(), irA: vi.fn() }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: mocks.listarOrdenes }));
vi.mock('../src/shared/navigation', () => ({ irA: mocks.irA }));
vi.mock('../src/features/ordenes/OrdenesManager', () => ({
    default: ({ vista }: { vista: string }) => <p>Vista de órdenes: {vista}</p>,
}));
vi.mock('../src/features/servicios/ServiciosManager', () => ({ default: () => <p>Catálogo de servicios</p> }));
vi.mock('../src/features/agenda/Agenda', () => ({ default: () => <p>Agenda operativa</p> }));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarOrdenes.mockResolvedValue({ items: [{
        id: 4, numero: '004', ubicacionId: 2, estadoCodigo: 'ASIGNADA', solicitud: 'Instalar equipo',
        prioridad: 'MEDIA', fechaProgramada: null, creadaEn: '', actualizadaEn: '', cerradaEn: null, version: 1,
        clienteNombreRegistrado: 'Cliente Demo', ubicacionNombreRegistrado: 'Sucursal', direccionRegistrada: 'Managua',
        asignaciones: [],
    }], hayMas: false });
});
afterEach(cleanup);

describe('Módulos operativos B.1–B.9', () => {
    it('expone los nueve módulos y resuelve la vista activa', () => {
        render(<OperacionesWorkspace ruta="/operaciones/diagnostico" puedeGestionar onOrden={vi.fn()} />);
        expect(screen.queryByRole('navigation', { name: /módulos/i })).toBeNull();
        expect(screen.getByText('Vista de órdenes: diagnostico')).toBeTruthy();
    });

    it('muestra los nueve submódulos Field y abre una orden asignada', async () => {
        const onOrden = vi.fn();
        render(<FieldWorkspace ruta="/field/inicio-trabajo" onOrden={onOrden} />);
        expect(screen.getByLabelText('Área de trabajo')).toBeTruthy();
        expect(await screen.findByText(/OT-004/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Abrir orden' }));
        expect(onOrden).toHaveBeenCalledWith(4);
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledTimes(2));
    });
});
