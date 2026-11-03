import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UsuariosManager from '../src/features/administracion/UsuariosManager';

const mocks = vi.hoisted(() => ({ listarUsuarios: vi.fn(), listarRolesAcceso: vi.fn(), cambiarEstadoAcceso: vi.fn(), guardarAcceso: vi.fn(), listarEmpleados: vi.fn() }));
vi.mock('../src/features/administracion/administracion.api', () => ({
    listarUsuarios: mocks.listarUsuarios, listarRolesAcceso: mocks.listarRolesAcceso,
    cambiarEstadoAcceso: mocks.cambiarEstadoAcceso, guardarAcceso: mocks.guardarAcceso,
}));
vi.mock('../src/features/empleados/empleados.api', () => ({ listarEmpleados: mocks.listarEmpleados }));

const rol = { id: 1, cod: 'ADMIN', nombre: 'Administrador', descripcion: 'Acceso total' };
const usuario = { id: 4, identificador: 'ana.admin', activo: true, rol,
    empleado: { id: 10, codEmpleado: 'EMP-10', active: true, habilitadoComoTecnico: false, persona: { firstName: 'Ana', firstLastName: 'López' } } };
const empleado = { id: 11, codEmpleado: 'EMP-11', active: true, habilitadoComoTecnico: true,
    persona: { firstName: 'Luis', firstLastName: 'Pérez', secondName: null, secondLastName: null } };

beforeEach(() => {
    vi.resetAllMocks(); mocks.listarUsuarios.mockResolvedValue([usuario]); mocks.listarRolesAcceso.mockResolvedValue([rol]);
    mocks.listarEmpleados.mockResolvedValue({ items: [usuario.empleado, empleado], pagina: 1, limite: 100, hayMas: false, total: 2,
        resumen: { total: 2, activos: 2, tecnicosHabilitados: 1 } }); mocks.cambiarEstadoAcceso.mockResolvedValue({}); mocks.guardarAcceso.mockResolvedValue({});
});
afterEach(cleanup);

describe('Administración de accesos', () => {
    it('lista, filtra y limpia usuarios', async () => {
        render(<UsuariosManager />); await screen.findByText('ana.admin');
        expect(screen.getByText('Acceso total')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Buscar usuario'), { target: { value: 'inexistente' } });
        expect(screen.getByText('Sin usuarios para estos filtros')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        expect(screen.getByText('ana.admin')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Filtrar rol de usuario'), { target: { value: 'ADMIN' } });
        expect(screen.getByText('ana.admin')).toBeTruthy();
    });

    it('crea una cuenta para un empleado disponible', async () => {
        render(<UsuariosManager />); await screen.findByText('ana.admin');
        fireEvent.click(screen.getByRole('button', { name: '+ Crear usuario' }));
        fireEvent.change(screen.getByLabelText('Empleado *'), { target: { value: '11' } });
        fireEvent.change(screen.getByLabelText('Identificador *'), { target: { value: 'luis.tecnico' } });
        fireEvent.change(screen.getByLabelText('Rol *'), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/^Contraseña inicial/), { target: { value: 'Segura-123456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar acceso' }));
        await waitFor(() => expect(mocks.guardarAcceso).toHaveBeenCalledWith({ identificador: 'luis.tecnico', rolId: 1, empleadoId: 11, password: 'Segura-123456' }, undefined));
        await waitFor(() => expect(mocks.listarUsuarios).toHaveBeenCalledTimes(2));
    });

    it('edita y cambia el estado de una cuenta con confirmación', async () => {
        render(<UsuariosManager />); await screen.findByText('ana.admin');
        fireEvent.click(screen.getByRole('button', { name: 'Editar acceso' }));
        fireEvent.change(screen.getByLabelText('Identificador *'), { target: { value: 'ana.actualizada' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar acceso' }));
        await waitFor(() => expect(mocks.guardarAcceso).toHaveBeenCalledWith({ identificador: 'ana.actualizada', rolId: 1 }, 4));
        await screen.findByText('ana.admin');
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
        const dialogo = screen.getByRole('dialog');
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar' }));
        await waitFor(() => expect(mocks.cambiarEstadoAcceso).toHaveBeenCalledWith(4, false));
    });

    it('cancela formularios y confirmaciones', async () => {
        render(<UsuariosManager />); await screen.findByText('ana.admin');
        fireEvent.click(screen.getByRole('button', { name: '+ Crear usuario' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('muestra errores de carga, guardado y cambio de estado', async () => {
        mocks.listarUsuarios.mockRejectedValueOnce(new Error('Accesos no disponibles')).mockResolvedValue([usuario]);
        render(<UsuariosManager />); expect(await screen.findByText('Accesos no disponibles')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByText('ana.admin');
        mocks.guardarAcceso.mockRejectedValueOnce(new Error('Identificador duplicado'));
        fireEvent.click(screen.getByRole('button', { name: 'Editar acceso' }));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar acceso' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Identificador duplicado');
    });
});
