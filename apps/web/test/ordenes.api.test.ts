import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => mocks);

import { cambiarEstadoOrden, crearOrden, listarOrdenes, obtenerOrden } from '../src/features/ordenes/ordenes.api';

beforeEach(() => vi.resetAllMocks());

describe('API web de órdenes', () => {
    it('lista con paginación y omite filtros vacíos', async () => {
        await listarOrdenes({ estado: '', buscar: '  ', pagina: 1, limite: 25 });
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes?pagina=1&limite=25');
    });

    it('envía filtros de estado, texto y página', async () => {
        await listarOrdenes({ estado: 'PENDIENTE', buscar: '  avería  ', pagina: 2, limite: 10 });
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes?pagina=2&limite=10&estado=PENDIENTE&buscar=aver%C3%ADa');
    });

    it('crea la orden con el cuerpo requerido', async () => {
        const datos = { ubicacionId: 3, solicitud: 'Revisión de equipo', prioridad: 'ALTA' as const };
        await crearOrden(datos);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes', {
            method: 'POST', body: JSON.stringify(datos),
        });
    });

    it('consulta el detalle por ID', async () => {
        await obtenerOrden(14);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/14');
    });

    it('envía estado y motivo de transición', async () => {
        await cambiarEstadoOrden(14, 'CANCELADA', 'Decisión del cliente');
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/14/estado', {
            method: 'PATCH', body: JSON.stringify({ estado: 'CANCELADA', motivo: 'Decisión del cliente' }),
        });
    });
});
