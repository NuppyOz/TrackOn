import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AsignarOrdenPanel from '../src/features/ordenes/AsignarOrdenPanel';
import type { OrdenDetalle } from '../src/features/ordenes/ordenes.types';

const mocks = vi.hoisted(() => ({ listarCuadrillas: vi.fn(), asignarOrden: vi.fn() }));
vi.mock('../src/features/cuadrillas/cuadrillas.api', () => ({ listarCuadrillas: mocks.listarCuadrillas }));
vi.mock('../src/features/ordenes/ordenes.api', () => ({ asignarOrden: mocks.asignarOrden }));

const orden = {
    id: 8, numero: '80', clienteNombreRegistrado: 'Empresa', ubicacionNombreRegistrado: 'Sucursal',
    prioridad: 'MEDIA', estadoCodigo: 'PENDIENTE',
} as OrdenDetalle;
const cuadrilla = {
    id: 4, nombre: 'Cuadrilla Norte', activa: true,
    miembros: [{ fin: null, esLider: true, empleado: {
        id: 7, active: true, habilitadoComoTecnico: true,
        persona: { firstName: 'Ana', firstLastName: 'Pérez' },
    } }],
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarCuadrillas.mockResolvedValue({ items: [cuadrilla], pagina: 1, hayMas: false });
    mocks.asignarOrden.mockResolvedValue({ ...orden, estadoCodigo: 'ASIGNADA' });
});
afterEach(() => cleanup());

describe('Asignación visual de órdenes según Figma', () => {
    it('muestra formulario, resumen y cuadrillas disponibles', async () => {
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={vi.fn()} />);
        expect(await screen.findByRole('option', { name: 'Cuadrilla Norte' })).toBeTruthy();
        expect(screen.getByText('Resumen de OT-80')).toBeTruthy();
    });

    it('muestra líder técnico real al seleccionar cuadrilla', async () => {
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={vi.fn()} />);
        await screen.findByRole('option', { name: 'Cuadrilla Norte' });
        fireEvent.change(screen.getByRole('combobox', { name: 'Cuadrilla para asignación' }), { target: { value: '4' } });
        expect(screen.getByRole('textbox', { name: 'Técnico líder' })).toHaveProperty('value', 'Ana Pérez');
    });

    it('envía asignación al backend y notifica cambio de estado', async () => {
        const onAssigned = vi.fn();
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={onAssigned} />);
        await screen.findByRole('option', { name: 'Cuadrilla Norte' });
        fireEvent.change(screen.getByRole('combobox', { name: 'Cuadrilla para asignación' }), { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
        await waitFor(() => expect(mocks.asignarOrden).toHaveBeenCalledWith(8, {
            cuadrillaId: 4, motivo: 'Asignación inicial de la orden.',
        }));
        await waitFor(() => expect(onAssigned).toHaveBeenCalledWith(expect.objectContaining({ estadoCodigo: 'ASIGNADA' })));
    });

    it('rechaza cuadrillas sin líder habilitado', async () => {
        mocks.listarCuadrillas.mockResolvedValue({ items: [{ ...cuadrilla, miembros: [] }] });
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={vi.fn()} />);
        expect(await screen.findByText(/No hay cuadrillas activas con líder/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toHaveProperty('disabled', true);
    });

    it('permite cancelar sin enviar datos', async () => {
        const onCancel = vi.fn();
        render(<AsignarOrdenPanel orden={orden} onCancel={onCancel} onAssigned={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(onCancel).toHaveBeenCalledOnce();
        expect(mocks.asignarOrden).not.toHaveBeenCalled();
    });

    it('presenta los errores del backend sin cerrar formulario', async () => {
        mocks.asignarOrden.mockRejectedValue(new Error('Orden modificada por otro administrador'));
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={vi.fn()} />);
        await screen.findByRole('option', { name: 'Cuadrilla Norte' });
        fireEvent.change(screen.getByRole('combobox', { name: 'Cuadrilla para asignación' }), { target: { value: '4' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Orden modificada por otro administrador');
    });

    it('muestra error si no se pueden consultar cuadrillas', async () => {
        mocks.listarCuadrillas.mockRejectedValue(new Error('Sin conexión'));
        render(<AsignarOrdenPanel orden={orden} onCancel={vi.fn()} onAssigned={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin conexión');
    });
});
