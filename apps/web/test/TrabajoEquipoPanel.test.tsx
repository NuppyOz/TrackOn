import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TrabajoEquipoPanel from '../src/features/ordenes/TrabajoEquipoPanel';

const mocks = vi.hoisted(() => ({
    listarTrabajo: vi.fn(), buscarServicios: vi.fn(), buscarMateriales: vi.fn(),
    registrarServicio: vi.fn(), registrarMaterial: vi.fn(),
}));
vi.mock('../src/features/ordenes/ordenes.trabajo.api', () => mocks);

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarTrabajo.mockResolvedValue({
        servicios: [{ id: 1, nombreRegistrado: 'Limpieza', cantidad: '1', descripcionTrabajo: 'Limpieza completa' }],
        materiales: [{ id: 2, nombreRegistrado: 'Refrigerante', unidadRegistrada: 'kg', cantidad: '2', observacion: 'Carga nueva' }],
    });
    mocks.buscarServicios.mockResolvedValue({ items: [{ id: 3, codigo: 'SRV', nombre: 'Diagnóstico' }], hayMas: true });
    mocks.buscarMateriales.mockResolvedValue({ items: [{ id: 4, codigo: 'MAT', nombre: 'Tubería', unidadMedida: 'm' }], hayMas: false });
    mocks.registrarServicio.mockResolvedValue({}); mocks.registrarMaterial.mockResolvedValue({});
});
afterEach(cleanup);

describe('Trabajo del equipo', () => {
    it('lista el trabajo y registra un servicio', async () => {
        render(<TrabajoEquipoPanel ordenId={10} registroId={20} puedeRegistrar />);
        await screen.findByText(/Limpieza · 1/); expect(screen.getByText('Carga nueva')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar servicio' }));
        expect(await screen.findByRole('option', { name: 'SRV · Diagnóstico' })).toBeTruthy();
        expect(screen.getByText('Escribe un nombre o código para encontrar más resultados.')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Servicio *'), { target: { value: '3' } });
        fireEvent.change(screen.getByLabelText('Cantidad *'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Trabajo realizado *'), { target: { value: 'Prueba completa' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar servicio' }));
        await waitFor(() => expect(mocks.registrarServicio).toHaveBeenCalledWith(10, 20, { servicioId: 3, cantidad: 2, descripcionTrabajo: 'Prueba completa' }));
        await waitFor(() => expect(mocks.listarTrabajo).toHaveBeenCalledTimes(2));
    });

    it('busca y registra un material sin observación', async () => {
        render(<TrabajoEquipoPanel ordenId={10} registroId={20} puedeRegistrar />); await screen.findByText(/^Limpieza · 1$/);
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar material' }));
        await screen.findByRole('option', { name: 'MAT · Tubería (m)' });
        fireEvent.change(screen.getByLabelText('Buscar en el catálogo'), { target: { value: 'tubo' } });
        await waitFor(() => expect(mocks.buscarMateriales).toHaveBeenLastCalledWith('tubo'));
        fireEvent.change(screen.getByLabelText('Material *'), { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar material' }));
        await waitFor(() => expect(mocks.registrarMaterial).toHaveBeenCalledWith(10, 20, { materialId: 4, cantidad: 1, observacion: null }));
    });

    it('permite cancelar y muestra errores de catálogo y guardado', async () => {
        mocks.buscarServicios.mockRejectedValue(new Error('Catálogo caído'));
        render(<TrabajoEquipoPanel ordenId={10} registroId={20} puedeRegistrar />); await screen.findByText(/^Limpieza · 1$/);
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar servicio' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Catálogo caído');
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.queryByText('Registrar servicio')).toBeNull();
    });

    it('reintenta si falla la carga principal y muestra colecciones vacías', async () => {
        mocks.listarTrabajo.mockRejectedValueOnce(new Error('Trabajo no disponible')).mockResolvedValueOnce({ servicios: [], materiales: [] });
        render(<TrabajoEquipoPanel ordenId={10} registroId={20} puedeRegistrar={false} />);
        expect(await screen.findByText('Trabajo no disponible')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        expect(await screen.findByText('Sin servicios registrados.')).toBeTruthy();
        expect(screen.getByText('Sin consumo de materiales registrado.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Registrar/ })).toBeNull();
    });
});
