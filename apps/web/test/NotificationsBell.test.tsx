import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsBell from '../src/features/notificaciones/NotificationsBell';

const mocks = vi.hoisted(() => ({ contar: vi.fn(), listar: vi.fn(), leer: vi.fn(), navegar: vi.fn() }));
vi.mock('../src/features/notificaciones/notificaciones.api', () => ({ contarNoLeidas: mocks.contar, listarNotificaciones: mocks.listar, marcarNotificacionLeida: mocks.leer }));
vi.mock('../src/shared/navigation', () => ({ irA: mocks.navegar }));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.contar.mockResolvedValue({ noLeidas: 1 });
    mocks.listar.mockResolvedValue({ noLeidas: 1, nextCursor: null, items: [
        { id: 7, ordenId: 12, tipo: 'ORDEN_ASIGNADA', mensaje: 'Tienes una orden asignada', creadaEn: new Date().toISOString(), leidaEn: null },
    ] });
    mocks.leer.mockResolvedValue({ id: 7 });
});
afterEach(cleanup);

describe('Bandeja personal de notificaciones', () => {
    it('permite actualizar la bandeja abierta para ver avisos nuevos', async () => {
        render(<NotificationsBell habilitada />);
        fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }));
        await screen.findByRole('button', { name: /Tienes una orden asignada/ });
        mocks.listar.mockResolvedValue({ noLeidas: 2, nextCursor: null, items: [{ id: 9, ordenId: 13, tipo: 'CAMBIO_ESTADO', mensaje: 'Trabajo enviado a revisión', creadaEn: new Date().toISOString(), leidaEn: null }] });
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar notificaciones' }));
        await screen.findByRole('button', { name: /Trabajo enviado a revisión/ });
        expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeTruthy();
    });
    it('marca el aviso como leído antes de abrir su orden', async () => {
        render(<NotificationsBell habilitada />);
        fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }));
        fireEvent.click(await screen.findByRole('button', { name: /Tienes una orden asignada/ }));
        await waitFor(() => expect(mocks.navegar).toHaveBeenCalledWith('/ordenes/12'));
        expect(mocks.leer).toHaveBeenCalledExactlyOnceWith(7);
        expect(screen.queryByRole('region', { name: 'Notificaciones' })).toBeNull();
    });
    it('mantiene la bandeja abierta y no navega si falla marcar la lectura', async () => {
        mocks.leer.mockRejectedValue(new Error('Conexión interrumpida'));
        render(<NotificationsBell habilitada />);
        fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }));
        fireEvent.click(await screen.findByRole('button', { name: /Tienes una orden asignada/ }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Conexión interrumpida'));
        expect(mocks.navegar).not.toHaveBeenCalled();
    });
    it('actualiza el contador al recuperar el foco y elimina el listener al desmontar', async () => {
        const vista = render(<NotificationsBell habilitada />);
        await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' });
        mocks.contar.mockResolvedValue({ noLeidas: 3 });
        fireEvent(window, new Event('focus'));
        await screen.findByRole('button', { name: 'Notificaciones, 3 sin leer' });
        vista.unmount();
        fireEvent(window, new Event('focus'));
        expect(mocks.contar).toHaveBeenCalledTimes(2);
    });
    it('no consulta datos sin sesión', () => {
        render(<NotificationsBell habilitada={false} />);
        expect(mocks.contar).not.toHaveBeenCalled();
    });
});
