import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EquiposOrdenPanel from '../src/features/ordenes/EquiposOrdenPanel';
import type { OrdenDetalle } from '../src/features/ordenes/ordenes.types';

const mocks = vi.hoisted(() => ({
    listarEquiposOrden: vi.fn(), listarEquiposDisponiblesOrden: vi.fn(),
    vincularEquipoOrden: vi.fn(), guardarDiagnosticoOrden: vi.fn(),
}));
vi.mock('../src/features/ordenes/ordenes.equipos.api', () => mocks);

const equipo = { id: 11, codigo: 'EQ-011', tipo: 'Aire acondicionado', marca: 'LG', modelo: 'X', numeroSerie: 'A1', ubicacionId: 5 };
const registro = {
    id: 20, ordenId: 4, equipoId: 11, tipoRegistrado: equipo.tipo, marcaRegistrada: 'LG',
    modeloRegistrado: 'X', serieRegistrada: 'A1', diagnostico: null, observaciones: null,
    resultado: null, creadaEn: '2026-10-09T12:00:00Z', actualizadaEn: '2026-10-09T12:00:00Z', equipo,
};
const orden = { id: 4, numero: '40', ubicacionNombreRegistrado: 'Sucursal Managua', estadoCodigo: 'EN_EJECUCION' } as OrdenDetalle;

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarEquiposOrden.mockResolvedValue([registro]);
    mocks.listarEquiposDisponiblesOrden.mockResolvedValue([equipo]);
    mocks.vincularEquipoOrden.mockResolvedValue(registro);
    mocks.guardarDiagnosticoOrden.mockResolvedValue({ ...registro, diagnostico: 'Compresor está averiado' });
});
afterEach(() => cleanup());

describe('Equipos de orden según Figma', () => {
    it('muestra el equipo vinculado y su identificación real', async () => {
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        expect(await screen.findByText('EQ-011')).toBeTruthy();
        expect(screen.getByText('A1')).toBeTruthy();
        expect(screen.getByText(/Sucursal Managua/)).toBeTruthy();
    });
    it('permite vincular un equipo disponible', async () => {
        mocks.listarEquiposOrden.mockResolvedValue([]);
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByRole('option', { name: /EQ-011/ });
        fireEvent.change(screen.getByRole('combobox', { name: 'Equipo de la ubicación' }), { target: { value: '11' } });
        fireEvent.click(screen.getByRole('button', { name: 'Vincular equipo' }));
        await waitFor(() => expect(mocks.vincularEquipoOrden).toHaveBeenCalledWith(4, 11));
        expect(await screen.findByText('Equipo vinculado correctamente.')).toBeTruthy();
    });
    it('no permite vincular si no tiene permisos administrativos', async () => {
        render(<EquiposOrdenPanel orden={orden} puedeGestionar={false} />);
        await screen.findByText('EQ-011');
        expect(screen.queryByRole('button', { name: 'Vincular equipo' })).toBeNull();
        expect(mocks.listarEquiposDisponiblesOrden).not.toHaveBeenCalled();
    });
    it('no permite vincular en estado de revisión', async () => {
        render(<EquiposOrdenPanel orden={{ ...orden, estadoCodigo: 'EN_REVISION' }} puedeGestionar />);
        await screen.findByText('EQ-011');
        expect(screen.queryByRole('button', { name: 'Vincular equipo' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Registrar diagnóstico' })).toBeNull();
    });
    it('permite abrir formulario de diagnóstico en ejecución', async () => {
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByText('EQ-011');
        fireEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
        expect(screen.getByRole('textbox', { name: 'Diagnóstico' })).toBeTruthy();
    });
    it('guarda diagnóstico y presenta el resultado', async () => {
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByText('EQ-011');
        fireEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Diagnóstico' }), { target: { value: 'Compresor está averiado' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar diagnóstico' }));
        await waitFor(() => expect(mocks.guardarDiagnosticoOrden).toHaveBeenCalledWith(4, 20, {
            diagnostico: 'Compresor está averiado', observaciones: null, resultado: null,
        }));
        expect(await screen.findByText('Diagnóstico guardado correctamente.')).toBeTruthy();
    });
    it('permite cancelar diagnóstico sin persistir', async () => {
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByText('EQ-011');
        fireEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(mocks.guardarDiagnosticoOrden).not.toHaveBeenCalled();
    });
    it('mantiene el formulario ante error de API', async () => {
        mocks.guardarDiagnosticoOrden.mockRejectedValue(new Error('No autorizado'));
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByText('EQ-011');
        fireEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Diagnóstico' }), { target: { value: 'Compresor está averiado' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar diagnóstico' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No autorizado');
        expect(screen.getByRole('textbox', { name: 'Diagnóstico' })).toBeTruthy();
    });
    it('maneja error al consultar equipos', async () => {
        mocks.listarEquiposOrden.mockRejectedValue(new Error('Sin conexión'));
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin conexión');
    });
    it('muestra los diagnósticos existentes y permite modificarlos', async () => {
        mocks.listarEquiposOrden.mockResolvedValue([{ ...registro, diagnostico: 'Ruido en ventilador', resultado: 'Pendiente' }]);
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        expect(await screen.findByText('Ruido en ventilador')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Editar diagnóstico' }));
        expect(screen.getByRole('textbox', { name: 'Diagnóstico' })).toHaveProperty('value', 'Ruido en ventilador');
    });
    it('presenta estado vacío sin equipos', async () => {
        mocks.listarEquiposOrden.mockResolvedValue([]);
        mocks.listarEquiposDisponiblesOrden.mockResolvedValue([]);
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        expect(await screen.findByText('Todavía no hay equipos vinculados a esta orden.')).toBeTruthy();
        expect(screen.getByText(/No hay más equipos activos/)).toBeTruthy();
    });
    it('muestra errores al vincular sin perder la selección', async () => {
        mocks.listarEquiposOrden.mockResolvedValue([]);
        mocks.vincularEquipoOrden.mockRejectedValue(new Error('Equipo de otra ubicación'));
        render(<EquiposOrdenPanel orden={orden} puedeGestionar />);
        await screen.findByRole('option', { name: /EQ-011/ });
        fireEvent.change(screen.getByRole('combobox', { name: 'Equipo de la ubicación' }), { target: { value: '11' } });
        fireEvent.click(screen.getByRole('button', { name: 'Vincular equipo' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Equipo de otra ubicación');
        expect(screen.getByRole('combobox', { name: 'Equipo de la ubicación' })).toHaveProperty('value', '11');
    });
});
