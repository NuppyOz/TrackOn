import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));

import { obtenerResumen } from '../src/features/dashboard/dashboard.api';
import {
    cambiarEstadoMaterial,
    crearMaterial,
    editarMaterial,
    listarMateriales,
} from '../src/features/materiales/materiales.api';
import {
    contarNoLeidas,
    listarNotificaciones,
    marcarNotificacionLeida,
    marcarTodasNotificacionesLeidas,
} from '../src/features/notificaciones/notificaciones.api';
import {
    buscarMateriales,
    buscarServicios,
    listarTrabajo,
    registrarMaterial,
    registrarServicio,
} from '../src/features/ordenes/ordenes.trabajo.api';

beforeEach(() => {
    vi.resetAllMocks();
    mocks.api.mockResolvedValue({});
});

describe('clientes HTTP de operaciones', () => {
    it('consulta el resumen operativo', async () => {
        await obtenerResumen();

        expect(mocks.api).toHaveBeenCalledWith('/api/dashboard/resumen?periodo=mes');
    });

    it('lista materiales con filtros y paginación codificados', async () => {
        await listarMateriales('inactivos', 'gas & aceite', 3, 10);

        const url = new URL(mocks.api.mock.calls[0][0] as string, 'http://localhost');
        expect(Object.fromEntries(url.searchParams)).toEqual({
            estado: 'inactivos',
            buscar: 'gas & aceite',
            pagina: '3',
            limite: '10',
        });
    });

    it('crea, edita y cambia el estado de materiales', async () => {
        const datos = { codigo: 'MAT-1', nombre: 'Gas refrigerante', unidadMedida: 'kg' };

        await crearMaterial(datos);
        await editarMaterial(7, datos);
        await cambiarEstadoMaterial(7, false);

        expect(mocks.api).toHaveBeenNthCalledWith(1, '/api/materiales', {
            method: 'POST', body: JSON.stringify(datos),
        });
        expect(mocks.api).toHaveBeenNthCalledWith(2, '/api/materiales/7', {
            method: 'PATCH', body: JSON.stringify(datos),
        });
        expect(mocks.api).toHaveBeenNthCalledWith(3, '/api/materiales/7/estado', {
            method: 'PATCH', body: JSON.stringify({ activo: false }),
        });
    });

    it('lista notificaciones con y sin cursor', async () => {
        await listarNotificaciones();
        await listarNotificaciones(42);

        expect(mocks.api).toHaveBeenNthCalledWith(1, '/api/notificaciones?limite=20');
        expect(mocks.api).toHaveBeenNthCalledWith(2, '/api/notificaciones?limite=20&cursor=42');
    });

    it('consulta el contador y marca una o todas las notificaciones como leídas', async () => {
        await contarNoLeidas();
        await marcarNotificacionLeida(9);
        await marcarTodasNotificacionesLeidas();

        expect(mocks.api).toHaveBeenNthCalledWith(1, '/api/notificaciones/unread-count');
        expect(mocks.api).toHaveBeenNthCalledWith(2, '/api/notificaciones/9/leida', { method: 'PATCH' });
        expect(mocks.api).toHaveBeenNthCalledWith(3, '/api/notificaciones/leidas', { method: 'PATCH' });
    });

    it('consulta y registra trabajo para un equipo', async () => {
        const servicio = { servicioId: 2, cantidad: 1, descripcionTrabajo: 'Limpieza' };
        const material = { materialId: 3, cantidad: 2, observacion: null };

        await listarTrabajo(5, 8);
        await registrarServicio(5, 8, servicio);
        await registrarMaterial(5, 8, material);

        expect(mocks.api).toHaveBeenNthCalledWith(1, '/api/ordenes/5/equipos/8/trabajo');
        expect(mocks.api).toHaveBeenNthCalledWith(2, '/api/ordenes/5/equipos/8/servicios', {
            method: 'POST', body: JSON.stringify(servicio),
        });
        expect(mocks.api).toHaveBeenNthCalledWith(3, '/api/ordenes/5/equipos/8/materiales', {
            method: 'POST', body: JSON.stringify(material),
        });
    });

    it('busca catálogos activos y codifica el texto', async () => {
        await buscarServicios('aire & frío');
        await buscarMateriales('tubo cobre');

        const servicios = new URL(mocks.api.mock.calls[0][0] as string, 'http://localhost');
        const materiales = new URL(mocks.api.mock.calls[1][0] as string, 'http://localhost');
        expect(Object.fromEntries(servicios.searchParams)).toEqual({
            estado: 'activos', buscar: 'aire & frío', limite: '100',
        });
        expect(Object.fromEntries(materiales.searchParams)).toEqual({
            estado: 'activos', buscar: 'tubo cobre', limite: '100',
        });
    });
});
