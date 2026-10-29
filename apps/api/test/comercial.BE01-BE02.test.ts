import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    cliente: { findUnique: vi.fn() },
    perfilComercialCliente: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    contactoComercial: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
}));

vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: db }));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { contactosComercialesRouter } from '../src/modules/comercial/crm/contactos/contactos.routes.js';
import { perfilComercialRouter } from '../src/modules/comercial/crm/perfil/perfil.routes.js';

const app = express();
app.use(express.json());
app.use('/api/comercial/clientes/:clienteId', perfilComercialRouter, contactosComercialesRouter);
app.use(manageErrors);

describe('BE01–BE02 perfil y contactos comerciales', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.$transaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
        db.cliente.findUnique.mockResolvedValue({ id: 7, activo: true });
        db.perfilComercialCliente.findUnique.mockResolvedValue(null);
        db.perfilComercialCliente.create.mockImplementation(async ({ data }) => ({ id: 1, ...data, version: 1, actualizadoEn: new Date('2026-10-20T12:00:00Z') }));
        db.perfilComercialCliente.updateMany.mockResolvedValue({ count: 1 });
        db.contactoComercial.findMany.mockResolvedValue([]);
        db.contactoComercial.create.mockImplementation(async ({ data }) => ({ id: 19, ...data, activo: true, version: 1, creadoEn: new Date(), actualizadoEn: new Date() }));
        db.contactoComercial.findFirst.mockResolvedValue({ id: 19, clienteId: 7, nombre: 'Ana', version: 2 });
        db.contactoComercial.updateMany.mockResolvedValue({ count: 1 });
    });

    it('retorna el perfil vacío y permite crearlo con versión cero', async () => {
        const get = await request(app).get('/api/comercial/clientes/7/perfil');
        expect(get.status).toBe(200);
        expect(get.body.data).toEqual({ clienteId: 7, clasificacion: null, instruccionesFacturacion: null, version: 0 });

        const put = await request(app).put('/api/comercial/clientes/7/perfil').send({ version: 0, clasificacion: ' Empresa ' });
        expect(put.status).toBe(200);
        expect(db.perfilComercialCliente.create).toHaveBeenCalledWith({ data: {
            clienteId: 7, clasificacion: 'Empresa', instruccionesFacturacion: null,
        } });
    });

    it('actualiza el perfil de forma optimista y devuelve conflicto cuando la versión no coincide', async () => {
        db.perfilComercialCliente.updateMany.mockResolvedValueOnce({ count: 1 });
        db.perfilComercialCliente.findUnique.mockResolvedValueOnce({ clienteId: 7, clasificacion: 'Empresa', instruccionesFacturacion: null, version: 3 });
        const ok = await request(app).put('/api/comercial/clientes/7/perfil').send({ version: 2, clasificacion: 'Empresa' });
        expect(ok.status).toBe(200);
        expect(db.perfilComercialCliente.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clienteId: 7, version: 2 } }));

        db.perfilComercialCliente.updateMany.mockResolvedValueOnce({ count: 0 });
        const conflict = await request(app).put('/api/comercial/clientes/7/perfil').send({ version: 2, clasificacion: 'Otra' });
        expect(conflict.status).toBe(409);
    });

    it('rechaza perfil mutado para cliente inactivo e IDs fuera de rango', async () => {
        db.cliente.findUnique.mockResolvedValueOnce({ id: 7, activo: false });
        const inactive = await request(app).put('/api/comercial/clientes/7/perfil').send({ version: 0 });
        expect(inactive.status).toBe(409);
        const badId = await request(app).get('/api/comercial/clientes/2147483648/perfil');
        expect(badId.status).toBe(400);
    });

    it('lista contactos con búsqueda y orden en la consulta de base antes de paginar', async () => {
        const response = await request(app).get('/api/comercial/clientes/7/contactos?q=ana&pagina=2&limite=10&sortBy=nombre&sortDir=asc');
        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({ items: [], pagina: 2, limite: 10, hayMas: false });
        expect(db.contactoComercial.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ clienteId: 7, OR: expect.any(Array) }),
            orderBy: [{ nombre: 'asc' }, { id: 'desc' }], skip: 10, take: 11,
        }));
        const invalidFilter = await request(app).get('/api/comercial/clientes/7/contactos?estado=activo');
        expect(invalidFilter.status).toBe(400);
    });

    it('crea contactos validados y solo permite actualizar los pertenecientes al cliente con su versión', async () => {
        const created = await request(app).post('/api/comercial/clientes/7/contactos').send({ nombre: ' Ana ', email: 'ana@example.com' });
        expect(created.status).toBe(201);
        expect(created.body.data.nombre).toBe('Ana');

        const invalid = await request(app).post('/api/comercial/clientes/7/contactos').send({ nombre: 'Ana', email: '<script>' });
        expect(invalid.status).toBe(400);

        const updated = await request(app).patch('/api/comercial/clientes/7/contactos/19').send({ version: 1, cargo: 'Compras' });
        expect(updated.status).toBe(200);
        expect(db.contactoComercial.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 19, clienteId: 7, version: 1 } }));

        db.contactoComercial.updateMany.mockResolvedValueOnce({ count: 0 });
        db.contactoComercial.findFirst.mockResolvedValueOnce(null);
        const foreign = await request(app).patch('/api/comercial/clientes/7/contactos/20').send({ version: 1, activo: false });
        expect(foreign.status).toBe(404);

        db.contactoComercial.updateMany.mockResolvedValueOnce({ count: 0 });
        db.contactoComercial.findFirst.mockResolvedValueOnce({ id: 19 });
        const stale = await request(app).patch('/api/comercial/clientes/7/contactos/19').send({ version: 1, activo: false });
        expect(stale.status).toBe(409);
    });
});
