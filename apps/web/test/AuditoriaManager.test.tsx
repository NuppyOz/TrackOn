import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuditoriaManager from '../src/features/administracion/AuditoriaManager';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));

const items = [
    { id: 1, entidad: 'ORDEN', entidadId: '14', accion: 'CAMBIO_ESTADO', fecha: '2026-10-14T16:00:00Z', usuario: { identificador: 'ana.admin' } },
    { id: 2, entidad: 'USUARIO', entidadId: '4', accion: 'CREAR', fecha: '2026-10-14T17:00:00Z', usuario: null },
];

beforeEach(() => { vi.resetAllMocks(); mocks.api.mockResolvedValue({ items, hayMas: true, pagina: 1, limite: 25 }); });
afterEach(cleanup);

describe('Auditoría', () => {
    it('lista operaciones, actores humanos y del sistema', async () => {
        render(<AuditoriaManager />); expect(screen.getByText('Cargando auditoría…')).toBeTruthy();
        expect(await screen.findByText('ana.admin')).toBeTruthy();
        expect(screen.getByText('Sistema')).toBeTruthy(); expect(screen.getByText('CAMBIO ESTADO')).toBeTruthy();
    });

    it('pagina y actualiza los resultados', async () => {
        render(<AuditoriaManager />); await screen.findByText('ana.admin');
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        await waitFor(() => expect(mocks.api).toHaveBeenLastCalledWith('/api/auditoria?pagina=2&limite=25'));
        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
        await waitFor(() => expect(mocks.api).toHaveBeenLastCalledWith('/api/auditoria?pagina=1&limite=25'));
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        await waitFor(() => expect(mocks.api.mock.calls.length).toBeGreaterThan(2));
    });

    it('muestra resultados vacíos y errores de consulta', async () => {
        mocks.api.mockResolvedValueOnce({ items: [], hayMas: false, pagina: 1, limite: 25 });
        const vista = render(<AuditoriaManager />);
        expect(await screen.findByText('Sin operaciones registradas')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Anterior' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveProperty('disabled', true);
        vista.unmount(); mocks.api.mockRejectedValueOnce(new Error('Auditoría no disponible'));
        render(<AuditoriaManager />); expect(await screen.findByText('Auditoría no disponible')).toBeTruthy();
    });
});
