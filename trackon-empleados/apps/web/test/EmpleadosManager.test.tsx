import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EmpleadosManager from '../src/features/empleados/EmpleadosManager';

const mocks = vi.hoisted(() => ({
    listarEmpleados: vi.fn(), obtenerEmpleado: vi.fn(), crearEmpleado: vi.fn(), editarEmpleado: vi.fn(),
    cambiarEstadoEmpleado: vi.fn(), cambiarHabilitacionTecnica: vi.fn(),
}));
vi.mock('../src/features/empleados/empleados.api', () => mocks);

const empleado = { id: 7, codEmpleado: 'TEC-007', active: true, habilitadoComoTecnico: false,
    personaId: 3, persona: { id: 3, firstName: 'María', secondName: null, firstLastName: 'López',
        secondLastName: null, typeDocument: 'PASAPORTE', numberDocument: 'P0007', telephone: null, correo: null } };
const segundo = { id: 9, codEmpleado: 'ADM-009', active: false, habilitadoComoTecnico: false,
    persona: { firstName: 'Juan', secondName: null, firstLastName: 'Pérez', secondLastName: null } };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarEmpleados.mockResolvedValue([empleado, segundo]);
    mocks.obtenerEmpleado.mockResolvedValue(empleado);
    mocks.crearEmpleado.mockResolvedValue(empleado);
    mocks.editarEmpleado.mockResolvedValue(empleado);
    mocks.cambiarEstadoEmpleado.mockResolvedValue({});
    mocks.cambiarHabilitacionTecnica.mockResolvedValue({});
});

async function abrirDetalle() {
    render(<EmpleadosManager />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Ver detalle' }))[0]);
    await screen.findByRole('heading', { name: 'Detalle del empleado' });
}

describe('EmpleadosManager', () => {
    it('consulta empleados al entrar y muestra estadísticas', async () => {
        render(<EmpleadosManager />);
        expect(await screen.findByText('TEC-007')).toBeTruthy();
        expect(screen.getByText('ADM-009')).toBeTruthy();
        expect(mocks.listarEmpleados).toHaveBeenCalledOnce();
        expect(screen.getByText('Técnicos habilitados')).toBeTruthy();
    });
    it('filtra búsqueda por nombre y código', async () => {
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.change(screen.getByPlaceholderText('Código o nombre del empleado'), { target: { value: 'juan' } });
        expect(screen.getByText('ADM-009')).toBeTruthy();
        expect(screen.queryByText('TEC-007')).toBe(null);
    });
    it('filtra empleados por estado', async () => {
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'inactivos' } });
        expect(screen.getByText('ADM-009')).toBeTruthy();
        expect(screen.queryByText('TEC-007')).toBe(null);
    });
    it('limpia filtros y devuelve resultados', async () => {
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.change(screen.getByPlaceholderText('Código o nombre del empleado'), { target: { value: 'nada' } });
        expect(screen.getByText('No hay empleados con estos filtros.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
        expect(screen.getByText('TEC-007')).toBeTruthy();
    });
    it('abre ficha con datos completos de la API', async () => {
        render(<EmpleadosManager />);
        fireEvent.click((await screen.findAllByRole('button', { name: 'Ver detalle' }))[0]);
        await screen.findByText('P0007');
        expect(mocks.obtenerEmpleado).toHaveBeenCalledWith(7);
        expect(screen.getByText('Habilitación técnica')).toBeTruthy();
    });
    it('registra un empleado real con el contrato esperado', async () => {
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar empleado' }));
        fireEvent.change(screen.getByLabelText('Código de empleado *'), { target: { value: 'tec-010' } });
        fireEvent.change(screen.getByLabelText('Primer nombre *'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByLabelText('Primer apellido *'), { target: { value: 'Torres' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar empleado' }));
        await waitFor(() => expect(mocks.crearEmpleado).toHaveBeenCalledWith(expect.objectContaining({
            codEmpleado: 'TEC-010', persona: expect.objectContaining({ firstName: 'Ana', firstLastName: 'Torres' }),
        })));
    });
    it('no permite registrar un documento incompleto', async () => {
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar empleado' }));
        fireEvent.change(screen.getByLabelText('Código de empleado *'), { target: { value: 'TEC-010' } });
        fireEvent.change(screen.getByLabelText('Primer nombre *'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByLabelText('Primer apellido *'), { target: { value: 'Torres' } });
        fireEvent.change(screen.getByLabelText('Número de documento'), { target: { value: 'XXX' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar empleado' }));
        expect(screen.getByRole('alert').textContent).toContain('Indica conjuntamente');
        expect(mocks.crearEmpleado).not.toHaveBeenCalled();
    });
    it('edita datos existentes', async () => {
        await abrirDetalle();
        fireEvent.click(screen.getByRole('button', { name: 'Editar empleado' }));
        fireEvent.change(screen.getByLabelText('Primer nombre *'), { target: { value: 'Marina' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        await waitFor(() => expect(mocks.editarEmpleado).toHaveBeenCalledWith(7, expect.objectContaining({
            persona: expect.objectContaining({ firstName: 'Marina' }),
        })));
    });
    it('requiere confirmación para desactivar un empleado', async () => {
        await abrirDetalle();
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar empleado' }));
        expect(screen.getByRole('alertdialog')).toBeTruthy();
        expect(mocks.cambiarEstadoEmpleado).not.toHaveBeenCalled();
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar' }));
        await waitFor(() => expect(mocks.cambiarEstadoEmpleado).toHaveBeenCalledWith(7, false));
    });
    it('permite cancelar el cambio de estado sin llamar la API', async () => {
        await abrirDetalle();
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar empleado' }));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
        expect(screen.queryByRole('alertdialog')).toBe(null);
        expect(mocks.cambiarEstadoEmpleado).not.toHaveBeenCalled();
    });
    it('habilita técnicos solo después de confirmar', async () => {
        await abrirDetalle();
        fireEvent.click(screen.getByRole('button', { name: 'Habilitar como técnico' }));
        expect(mocks.cambiarHabilitacionTecnica).not.toHaveBeenCalled();
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar' }));
        await waitFor(() => expect(mocks.cambiarHabilitacionTecnica).toHaveBeenCalledWith(7, true));
    });
    it('muestra el error de API sin falsear datos', async () => {
        mocks.listarEmpleados.mockRejectedValue(new Error('No se pudo conectar con el servidor'));
        render(<EmpleadosManager />);
        expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar');
    });
    it('informa cuando un registro es duplicado', async () => {
        mocks.crearEmpleado.mockRejectedValue(new Error('El código de empleado ya existe.'));
        render(<EmpleadosManager />);
        await screen.findByText('TEC-007');
        fireEvent.click(screen.getByRole('button', { name: '+ Registrar empleado' }));
        fireEvent.change(screen.getByLabelText('Código de empleado *'), { target: { value: 'TEC-007' } });
        fireEvent.change(screen.getByLabelText('Primer nombre *'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByLabelText('Primer apellido *'), { target: { value: 'López' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar empleado' }));
        expect((await screen.findByRole('alert')).textContent).toContain('El código');
    });
});
