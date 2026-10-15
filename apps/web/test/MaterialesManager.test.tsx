import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MaterialesManager from '../src/features/materiales/MaterialesManager';
const mocks = vi.hoisted(() => ({ listar: vi.fn(), crear: vi.fn(), editar: vi.fn(), estado: vi.fn() }));
vi.mock('../src/features/materiales/materiales.api', () => ({ listarMateriales: mocks.listar, crearMaterial: mocks.crear, editarMaterial: mocks.editar, cambiarEstadoMaterial: mocks.estado }));
beforeEach(() => {
    vi.resetAllMocks();
    mocks.listar.mockResolvedValue({ items: [{ id: 1, codigo: 'REF', nombre: 'Refrigerante', unidadMedida: 'kg', activo: true }], hayMas: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('Materiales con permisos y operaciones asíncronas', () => {
    it('aplica el estado sin pulsar Buscar y limpia los filtros', async () => {
        mocks.listar.mockImplementation(async (estado: string) => ({ items: estado === 'inactivos' ? [] : [{ id: 1, codigo: 'REF', nombre: 'Refrigerante', unidadMedida: 'kg', activo: true }], hayMas: false }));
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText('Refrigerante');
        fireEvent.change(screen.getByLabelText('Estado del material'), { target: { value: 'inactivos' } });
        await screen.findByText('No hay materiales para estos filtros');
        expect(mocks.listar).toHaveBeenLastCalledWith('inactivos', '', 1);
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        await screen.findByText('Refrigerante');
        expect((screen.getByLabelText('Estado del material') as HTMLSelectElement).value).toBe('activos');
    });
    it('agrupa las pulsaciones de búsqueda y cancela la búsqueda pendiente al limpiar', async () => {
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText('Refrigerante');
        vi.useFakeTimers();
        const input = screen.getByLabelText('Buscar material');
        fireEvent.change(input, { target: { value: 'R' } });
        fireEvent.change(input, { target: { value: 'REF' } });
        await act(async () => { await vi.advanceTimersByTimeAsync(250); });
        expect(mocks.listar).toHaveBeenCalledTimes(2);
        expect(mocks.listar).toHaveBeenLastCalledWith('activos', 'REF', 1);
        fireEvent.change(input, { target: { value: 'no existente' } });
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
        expect(mocks.listar).toHaveBeenCalledTimes(3);
        expect(mocks.listar).toHaveBeenLastCalledWith('activos', '', 1);
    });
    it('permite consultar el catálogo al técnico y oculta las mutaciones', async () => {
        render(<MaterialesManager puedeGestionar={false} />);
        await screen.findByText('Refrigerante');
        expect(screen.queryByRole('button', { name: /Registrar material|Editar|Desactivar/ })).toBeNull();
    });
    it('bloquea otro envío mientras se guarda y conserva los campos ante un error', async () => {
        let rechazar!: (error: Error) => void;
        mocks.crear.mockReturnValue(new Promise((_, reject) => { rechazar = reject; }));
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText('Refrigerante');
        fireEvent.click(screen.getByRole('button', { name: /Registrar material/ }));
        fireEvent.change(screen.getByLabelText('Código *'), { target: { value: 'TUBO' } });
        fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Tubo de cobre' } });
        fireEvent.change(screen.getByLabelText('Unidad de medida *'), { target: { value: 'metro' } });
        const form = screen.getByLabelText('Código *').closest('form')!;
        fireEvent.submit(form);
        fireEvent.submit(form);
        expect(mocks.crear).toHaveBeenCalledTimes(1);
        rechazar(new Error('Código duplicado'));
        await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Código duplicado'));
        expect((screen.getByLabelText('Nombre *') as HTMLInputElement).value).toBe('Tubo de cobre');
    });
});
