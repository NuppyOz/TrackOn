import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    order: vi.fn(),
    linked: vi.fn(),
    equipment: vi.fn(),
    available: vi.fn(),
    existing: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateVersion: vi.fn(),
    assignment: vi.fn(),
    audit: vi.fn(),
    list: vi.fn(),
}));

vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: {
        ordenTrabajo: { findUnique: mocks.order },
        ordenEquipo: { findMany: mocks.list },
        equipo: { findMany: mocks.available },
        $transaction: (callback: (tx: unknown) => Promise<unknown>) => callback({
            ordenTrabajo: { findUnique: mocks.order, updateMany: mocks.updateVersion },
            equipo: { findFirst: mocks.equipment },
            ordenEquipo: { findFirst: mocks.existing, create: mocks.create, update: mocks.update },
            asignacion: { findFirst: mocks.assignment },
            auditoria: { create: mocks.audit },
        }),
    },
}));

import { disponibles, guardarDiagnostico, listarVinculados, vincular } from '../src/modules/ordenes/ordenes.equipos.repository.js';

const equipo = { id: 11, ubicacionId: 5, codigo: 'EQ-011', tipo: 'Aire acondicionado', marca: 'LG', modelo: 'X', numeroSerie: 'A1' };
const admin = { id: 1, empleadoId: 3, rol: 'ADMIN' };
const tecnico = { id: 2, empleadoId: 7, rol: 'TEC' };
const datos = { diagnostico: 'Compresor con desgaste mecánico', observaciones: null, resultado: 'Revisar repuestos' };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.order.mockResolvedValue({ id: 4, ubicacionId: 5, estadoCodigo: 'EN_EJECUCION', version: 2 });
    mocks.equipment.mockResolvedValue(equipo);
    mocks.existing.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: 20 });
    mocks.update.mockResolvedValue({ id: 20, ...datos });
    mocks.updateVersion.mockResolvedValue({ count: 1 });
    mocks.assignment.mockResolvedValue({ id: 9 });
    mocks.list.mockResolvedValue([]);
    mocks.available.mockResolvedValue([equipo]);
    mocks.audit.mockResolvedValue({ id: 14 });
});

describe('Persistencia de equipos intervenidos', () => {
    it('devuelve lista vinculada a una orden existente', async () => {
        expect(await listarVinculados(4)).toEqual([]);
        expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ where: { ordenId: 4 } }));
    });
    it('rechaza una orden inexistente al consultar', async () => {
        mocks.order.mockResolvedValue(null);
        await expect(listarVinculados(4)).rejects.toMatchObject({ statusCode: 404 });
        await expect(disponibles(4)).rejects.toMatchObject({ statusCode: 404 });
    });
    it('filtra equipos disponibles por ubicación y vínculo previo', async () => {
        expect(await disponibles(4)).toEqual([equipo]);
        expect(mocks.available).toHaveBeenCalledWith(expect.objectContaining({
            where: { ubicacionId: 5, activo: true, intervenciones: { none: { ordenId: 4 } } },
        }));
    });
    it('vincula equipo y conserva datos registrados de identificación', async () => {
        await vincular(4, 11);
        expect(mocks.equipment).toHaveBeenCalledWith(expect.objectContaining({ where: {
            id: 11, ubicacionId: 5, activo: true,
        } }));
        expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: {
            ordenId: 4, equipoId: 11, tipoRegistrado: equipo.tipo, marcaRegistrada: 'LG', modeloRegistrado: 'X', serieRegistrada: 'A1',
        } }));
    });
    it('no vincula a una orden inexistente o cerrada', async () => {
        mocks.order.mockResolvedValue(null);
        await expect(vincular(4, 11)).rejects.toMatchObject({ statusCode: 404 });
        mocks.order.mockResolvedValue({ ubicacionId: 5, estadoCodigo: 'CERRADA' });
        await expect(vincular(4, 11)).rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.create).not.toHaveBeenCalled();
    });
    it('rechaza equipos inactivos o de otra ubicación', async () => {
        mocks.equipment.mockResolvedValue(null);
        await expect(vincular(4, 11)).rejects.toMatchObject({ statusCode: 400 });
    });
    it('rechaza duplicados por orden', async () => {
        mocks.existing.mockResolvedValue({ id: 8 });
        await expect(vincular(4, 11)).rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.create).not.toHaveBeenCalled();
    });
    it('registra diagnóstico e historial de auditoría para ADMIN', async () => {
        mocks.existing.mockResolvedValue({ id: 20, diagnostico: null, observaciones: null, resultado: null });
        await guardarDiagnostico(4, 20, datos, admin);
        expect(mocks.updateVersion).toHaveBeenCalledWith({
            where: { id: 4, estadoCodigo: 'EN_EJECUCION', version: 2 },
            data: { version: { increment: 1 } },
        });
        expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 20 }, data: datos }));
        expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
            accion: 'REGISTRAR_DIAGNOSTICO', entidad: 'ORDEN_EQUIPO', usuarioId: 1,
        }) }));
    });
    it('permite a técnico que pertenece a la asignación', async () => {
        mocks.existing.mockResolvedValue({ id: 20, diagnostico: null, observaciones: null, resultado: null });
        await guardarDiagnostico(4, 20, datos, tecnico);
        expect(mocks.assignment).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
            ordenId: 4, fin: null,
        }) }));
    });
    it('rechaza a técnico que no está asignado', async () => {
        mocks.existing.mockResolvedValue({ id: 20 });
        mocks.assignment.mockResolvedValue(null);
        await expect(guardarDiagnostico(4, 20, datos, tecnico)).rejects.toMatchObject({ statusCode: 403 });
        expect(mocks.update).not.toHaveBeenCalled();
    });
    it('rechaza diagnóstico si la orden no está en ejecución', async () => {
        mocks.order.mockResolvedValue({ estadoCodigo: 'EN_REVISION' });
        await expect(guardarDiagnostico(4, 20, datos, admin)).rejects.toMatchObject({ statusCode: 409 });
    });
    it('rechaza registro ajeno a la orden', async () => {
        mocks.existing.mockResolvedValue(null);
        await expect(guardarDiagnostico(4, 20, datos, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
    it('evita guardar si otro usuario cambió la orden', async () => {
        mocks.existing.mockResolvedValue({ id: 20 });
        mocks.updateVersion.mockResolvedValue({ count: 0 });
        await expect(guardarDiagnostico(4, 20, datos, admin)).rejects.toMatchObject({ statusCode: 409 });
        expect(mocks.update).not.toHaveBeenCalled();
    });
    it('rechaza diagnóstico de orden inexistente', async () => {
        mocks.order.mockResolvedValue(null);
        await expect(guardarDiagnostico(4, 20, datos, admin)).rejects.toMatchObject({ statusCode: 404 });
    });
});
