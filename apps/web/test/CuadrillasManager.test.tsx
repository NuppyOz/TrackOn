import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CuadrillasManager from '../src/features/cuadrillas/CuadrillasManager';

const mocks = vi.hoisted(() => ({
    listarCuadrillas: vi.fn(), listarEmpleadosElegibles: vi.fn(), agregarMiembro: vi.fn(),
    cambiarEstadoCuadrilla: vi.fn(), crearCuadrilla: vi.fn(), definirLider: vi.fn(),
    editarCuadrilla: vi.fn(), retirarMiembro: vi.fn(),
}));
vi.mock('../src/features/cuadrillas/cuadrillas.api', () => mocks);
const cuadrilla = { id: 1, nombre: 'Cuadrilla Norte', activa: true, creadaEn: '2026-10-01T12:00:00Z', miembros: [] };
const pagina = (items = [cuadrilla]) => ({ items, hayMas: false, pagina: 1, limite: 25 });
beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarCuadrillas.mockResolvedValue(pagina());
    mocks.listarEmpleadosElegibles.mockResolvedValue([]);
});
afterEach(cleanup);

describe('Filtros de cuadrillas', () => {
    it('aplica el estado y la búsqueda sin enviar el formulario y permite limpiar', async () => {
        render(<CuadrillasManager />);
        await screen.findByText('Cuadrilla Norte', { selector: 'h3' });
        fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'inactivas' } });
        await waitFor(() => expect(mocks.listarCuadrillas).toHaveBeenLastCalledWith({ estado: 'inactivas', nombre: '' }));
        fireEvent.change(screen.getByLabelText('Buscar por nombre'), { target: { value: 'Sur' } });
        await waitFor(() => expect(mocks.listarCuadrillas).toHaveBeenLastCalledWith({ estado: 'inactivas', nombre: 'Sur' }));
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        await waitFor(() => expect(mocks.listarCuadrillas).toHaveBeenLastCalledWith({ estado: 'activas', nombre: '' }));
    });
    it('descarta un resultado antiguo junto con su panel de integrantes', async () => {
        render(<CuadrillasManager />);
        await screen.findByText('Cuadrilla Norte', { selector: 'h3' });
        let resolver!: (valor: ReturnType<typeof pagina>) => void;
        mocks.listarCuadrillas.mockReturnValueOnce(new Promise(resolve => { resolver = resolve; })).mockResolvedValueOnce(pagina([]));
        fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'todos' } });
        fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'inactivas' } });
        await screen.findByText('No hay cuadrillas para estos filtros.');
        await act(async () => { resolver(pagina()); });
        expect(screen.queryByText('Cuadrilla Norte')).toBeNull();
        expect(screen.queryByText('Integrantes vigentes e historial de pertenencia.')).toBeNull();
    });
});
