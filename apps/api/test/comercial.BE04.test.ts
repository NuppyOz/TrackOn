import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    cliente: { findUnique: vi.fn() },
    servicio: { findUnique: vi.fn() },
    material: { findUnique: vi.fn() },
    conceptoComercial: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    tarifaComercial: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
}));

vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: db }));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { tarifasComercialesRouter } from '../src/modules/comercial/tarifas/tarifas.routes.js';
import { resolverTarifa } from '../src/modules/comercial/tarifas/tarifas.service.js';

const app = express();
app.use(express.json());
app.use('/api/comercial', tarifasComercialesRouter);
app.use(manageErrors);

describe('BE04 conceptos y tarifas comerciales', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
        db.cliente.findUnique.mockResolvedValue({ id: 2, activo: true });
        db.servicio.findUnique.mockResolvedValue({ id: 3 });
        db.material.findUnique.mockResolvedValue({ id: 4 });
        db.conceptoComercial.findMany.mockResolvedValue([]);
        db.conceptoComercial.findUnique.mockResolvedValue({ id: 10, codigo: 'SERV-01', nombre: 'Mantenimiento', unidad: 'servicio', tipo: 'SERVICIO', activo: true });
        db.conceptoComercial.create.mockImplementation(async ({ data }) => ({ id: 10, ...data, activo: true, version: 1 }));
        db.conceptoComercial.updateMany.mockResolvedValue({ count: 1 });
        db.tarifaComercial.findMany.mockResolvedValue([]);
        db.tarifaComercial.findFirst.mockResolvedValue(null);
        db.tarifaComercial.findUnique.mockResolvedValue({ id: 11, conceptoId: 10, clienteId: null, moneda: 'NIO', precio: '125.00', activo: true, version: 2 });
        db.tarifaComercial.create.mockImplementation(async ({ data }) => ({ id: 11, ...data, version: 1, creadaEn: new Date() }));
        db.tarifaComercial.updateMany.mockResolvedValue({ count: 1 });
    });

    it('crea conceptos con código normalizado y rechaza referencias múltiples o referencias inexistentes', async () => {
        const creado = await request(app).post('/api/comercial/conceptos').send({
            codigo: '  mtto-01 ', tipo: 'SERVICIO', nombre: 'Mantenimiento', unidad: 'hora', servicioId: 3,
        });
        expect(creado.status).toBe(201);
        expect(creado.body.data.codigo).toBe('MTTO-01');
        expect(db.conceptoComercial.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ codigo: 'MTTO-01' }) }));

        const ambos = await request(app).post('/api/comercial/conceptos').send({
            codigo: 'X', tipo: 'SERVICIO', nombre: 'X', unidad: 'hora', servicioId: 3, materialId: 4,
        });
        expect(ambos.status).toBe(400);

        const expansionUnicode = await request(app).post('/api/comercial/conceptos').send({
            codigo: 'ß'.repeat(21), tipo: 'SERVICIO', nombre: 'X', unidad: 'hora',
        });
        expect(expansionUnicode.status).toBe(400);

        db.servicio.findUnique.mockResolvedValueOnce(null);
        const faltante = await request(app).post('/api/comercial/conceptos').send({
            codigo: 'Y', tipo: 'SERVICIO', nombre: 'Y', unidad: 'hora', servicioId: 30,
        });
        expect(faltante.status).toBe(404);
    });

    it('filtra y ordena conceptos en backend antes de paginar y rechaza filtros desconocidos', async () => {
        const response = await request(app).get('/api/comercial/conceptos?q=mtto&estado=activos&pagina=2&limite=5&sortBy=codigo&sortDir=desc');
        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({ items: [], pagina: 2, limite: 5, hayMas: false });
        expect(db.conceptoComercial.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ activo: true, OR: expect.any(Array) }),
            orderBy: [{ codigo: 'desc' }, { id: 'desc' }], skip: 5, take: 6,
        }));
        expect((await request(app).get('/api/comercial/conceptos?inactivo=true')).status).toBe(400);
    });

    it('crea tarifas NIO con precio normalizado, permite cero y valida activos/rango', async () => {
        const cero = await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, clienteId: 2, precio: '0' });
        expect(cero.status).toBe(201);
        expect(db.tarifaComercial.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ precio: '0.00', moneda: 'NIO', activo: true, version: 1 }) }));

        expect((await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, precio: -1 })).status).toBe(400);
        expect((await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, precio: 1 })).status).toBe(400);
        expect((await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, precio: '100000000000000.00' })).status).toBe(400);

        db.cliente.findUnique.mockResolvedValueOnce({ id: 2, activo: false });
        expect((await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, clienteId: 2, precio: '5.00' })).status).toBe(409);
    });

    it('traduce la unicidad parcial en 409 sin exponer errores de base', async () => {
        db.tarifaComercial.create.mockRejectedValueOnce({ code: 'P2002' });
        const response = await request(app).post('/api/comercial/tarifas').send({ conceptoId: 10, precio: '25.00' });
        expect(response.status).toBe(409);
        expect(response.body.error.message).toMatch(/tarifa activa/i);
        expect(JSON.stringify(response.body)).not.toMatch(/P2002|SQL/i);
    });

    it('resuelve primero cliente, luego estándar, conserva cero y devuelve concepto para BE06', async () => {
        db.tarifaComercial.findFirst.mockResolvedValueOnce({ id: 12, conceptoId: 10, clienteId: 2, moneda: 'NIO', precio: '0.00' });
        const cliente = await request(app).get('/api/comercial/tarifas/resolver?conceptoId=10&clienteId=2');
        expect(cliente.status).toBe(200);
        expect(cliente.body.data).toEqual({ tarifaId: 12, conceptoId: 10, clienteIdSolicitado: 2, origen: 'CLIENTE', moneda: 'NIO', precio: '0.00' });
        expect(db.tarifaComercial.findFirst).toHaveBeenCalledTimes(1);

        db.tarifaComercial.findFirst.mockReset();
        db.tarifaComercial.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 13, conceptoId: 10, clienteId: null, moneda: 'NIO', precio: '42' });
        const standard = await resolverTarifa(2, 10);
        expect(standard).toEqual(expect.objectContaining({ tarifaId: 13, origen: 'ESTANDAR', precio: '42.00', concepto: expect.objectContaining({ codigo: 'SERV-01' }) }));
        expect(db.tarifaComercial.findFirst).toHaveBeenCalledTimes(2);
    });

    it('conflicta al no haber tarifa activa y al aplicar una versión obsoleta', async () => {
        const missing = await request(app).get('/api/comercial/tarifas/resolver?conceptoId=10&clienteId=2');
        expect(missing.status).toBe(404);

        db.tarifaComercial.updateMany.mockResolvedValueOnce({ count: 0 });
        const stale = await request(app).patch('/api/comercial/tarifas/11/estado').send({ version: 1, activo: false });
        expect(stale.status).toBe(409);
        expect(db.tarifaComercial.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 11, version: 1 } }));
    });
});
