import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AdministracionWorkspace from '../src/features/administracion/AdministracionWorkspace';

const mocks = vi.hoisted(() => ({ listarRolesAcceso: vi.fn(), irA: vi.fn() }));
vi.mock('../src/features/administracion/administracion.api', () => ({ listarRolesAcceso: mocks.listarRolesAcceso }));
vi.mock('../src/shared/navigation', () => ({ irA: mocks.irA }));
vi.mock('../src/features/administracion/UsuariosManager', () => ({ default: () => <p>Listado de usuarios</p> }));

beforeEach(() => { vi.resetAllMocks(); mocks.listarRolesAcceso.mockResolvedValue([
    { id: 1, cod: 'ADMIN', nombre: 'Administrador', descripcion: 'Acceso total' },
    { id: 2, cod: 'TEC', nombre: 'Técnico', descripcion: 'Trabajo de campo' },
]); });
afterEach(cleanup);

describe('Administración de usuarios y permisos', () => {
    it('separa usuarios de roles con navegación clara', () => {
        render(<AdministracionWorkspace ruta="/administracion/usuarios" />);
        expect(screen.getByText('Listado de usuarios')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Roles y permisos' }));
        expect(mocks.irA).toHaveBeenCalledWith('/administracion/roles');
    });
    it('muestra los permisos efectivos de cada rol', async () => {
        render(<AdministracionWorkspace ruta="/administracion/roles" />);
        expect(await screen.findByText('Acceso total')).toBeTruthy();
        expect(screen.getByText('Administrar usuarios y roles')).toBeTruthy();
        expect(screen.getByText('Consultar sus órdenes asignadas')).toBeTruthy();
    });
});
