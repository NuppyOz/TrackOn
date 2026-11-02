import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '../src/App';

const mocks = vi.hoisted(() => ({ renovarSesion: vi.fn() }));
vi.mock('../src/features/auth/auth.api', () => ({
    renovarSesion: mocks.renovarSesion,
    cerrarSesion: vi.fn(),
    puedeAdministrarCatalogos: (rol: string) => rol === 'ADMIN' || rol === 'GTE_OPE',
}));
vi.mock('../src/features/notificaciones/NotificationsBell', () => ({ default: () => null }));

afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); vi.clearAllMocks(); });

describe('Acceso a las nuevas áreas', () => {
    it('impide al técnico abrir comercial mediante una URL directa', async () => {
        window.history.replaceState(null, '', '/comercial/crm');
        mocks.renovarSesion.mockResolvedValue({ id: 1, identificador: 'tecnico', rol: { cod: 'TEC', nombre: 'Técnico' }, empleado: {} });
        render(<App />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No tienes permisos para acceder a este módulo.');
        expect(screen.queryByRole('button', { name: /^Comercial$/ })).toBeNull();
    });

    it('abre el área comercial con sesión administrativa', async () => {
        window.history.replaceState(null, '', '/comercial/crm');
        mocks.renovarSesion.mockResolvedValue({ id: 2, identificador: 'admin', rol: { cod: 'ADMIN', nombre: 'Administrador' }, empleado: {} });
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Clientes y CRM' })).toBeTruthy();
    });

    it('reserva la administración de cuentas de portal al administrador', async () => {
        window.history.replaceState(null, '', '/comercial/portal-cuentas');
        mocks.renovarSesion.mockResolvedValue({ id: 3, identificador: 'gerente', rol: { cod: 'GTE_OPE', nombre: 'Gerente' }, empleado: {} });
        render(<App />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Solo un administrador puede gestionar el acceso al portal.');
    });
});
