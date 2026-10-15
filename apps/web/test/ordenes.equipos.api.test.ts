import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));
import {
    guardarDiagnosticoOrden,
    listarEquiposDisponiblesOrden,
    listarEquiposOrden,
    vincularEquipoOrden,
} from '../src/features/ordenes/ordenes.equipos.api';

beforeEach(() => { vi.resetAllMocks(); mocks.api.mockResolvedValue({ id: 1 }); });

describe('API del diagnóstico de órdenes', () => {
    it('consulta equipos asociados a una orden', async () => {
        await listarEquiposOrden(5);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/5/equipos');
    });
    it('consulta únicamente equipos disponibles de la ubicación', async () => {
        await listarEquiposDisponiblesOrden(5);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/5/equipos-disponibles');
    });
    it('vincula únicamente el identificador del equipo', async () => {
        await vincularEquipoOrden(5, 8);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/5/equipos', {
            method: 'POST', body: JSON.stringify({ equipoId: 8 }),
        });
    });
    it('registra el diagnóstico en el equipo correcto', async () => {
        const datos = { diagnostico: 'Compresor sin presión suficiente', observaciones: null };
        await guardarDiagnosticoOrden(5, 11, datos);
        expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/5/equipos/11/diagnostico', {
            method: 'PATCH', body: JSON.stringify(datos),
        });
    });
});
