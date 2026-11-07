import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AdministracionWorkspace from '../src/features/administracion/AdministracionWorkspace';

const mocks = vi.hoisted(() => ({ listarRolesAcceso: vi.fn(), listarUsuarios: vi.fn(), irA: vi.fn() }));
vi.mock('../src/features/administracion/administracion.api', () => ({ listarRolesAcceso: mocks.listarRolesAcceso, listarUsuarios: mocks.listarUsuarios }));
vi.mock('../src/shared/navigation', () => ({ irA: mocks.irA }));
vi.mock('../src/features/administracion/UsuariosManager', () => ({ default: () => <p>Listado de usuarios</p> }));

beforeEach(() => { vi.resetAllMocks(); mocks.listarRolesAcceso.mockResolvedValue([
    { id: 1, cod: 'ADMIN', nombre: 'Administrador', descripcion: 'Acceso total' },
    { id: 2, cod: 'TEC', nombre: 'Técnico', descripcion: 'Trabajo de campo' },
]);
mocks.listarUsuarios.mockResolvedValue([
    { id: 1, identificador: 'administrador', activo: true, rol: { id: 1, cod: 'ADMIN', nombre: 'Administrador', descripcion: 'Acceso total' }, permisos: ['ADMINISTRACION'], empleado: { id: 1, codEmpleado: 'ADM-900', active: true, habilitadoComoTecnico: false } },
    { id: 2, identificador: 'tecnico', activo: true, rol: { id: 2, cod: 'TEC', nombre: 'Técnico', descripcion: 'Trabajo de campo' }, permisos: [], empleado: { id: 2, codEmpleado: 'TEC-900', active: true, habilitadoComoTecnico: true } },
]); });
afterEach(cleanup);

describe('Administración de usuarios y permisos', () => {
    it('separa usuarios de roles con navegación clara', () => {
        render(<AdministracionWorkspace ruta="/administracion/usuarios" />);
        expect(screen.getByText('Listado de usuarios')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Roles y permisos' }));
        expect(mocks.irA).toHaveBeenCalledWith('/administracion/roles');
    });
    it('muestra las cuentas y los permisos registrados por usuario', async () => {
        render(<AdministracionWorkspace ruta="/administracion/roles" />);
        expect(await screen.findByText('Acceso total')).toBeTruthy();
        expect(screen.getAllByText('Cuentas con este perfil (1)').length).toBe(2);
        expect(screen.getByText('ADMINISTRACION')).toBeTruthy();
        expect(screen.getByText('Sin permisos registrados')).toBeTruthy();
        // La pantalla ya no afirma que los permisos se validen en la API.
        expect(screen.getByText(/todavía no restringen el acceso/)).toBeTruthy();
    });
});
