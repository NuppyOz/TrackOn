import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ asignar: vi.fn(), rol: 'ADMIN', autenticado: true }));
vi.mock('../src/modules/ordenes/ordenes.asignacion.service.js', () => ({ asignar: mocks.asignar }));
vi.mock('../src/middlewares/authenticate.js', () => ({
    authenticate: (req: Request, _res: Response, next: NextFunction) => {
        if (mocks.autenticado) Object.assign(req, { auth: { usuario: { id: 3, rol: { cod: mocks.rol } } } });
        next();
    },
}));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { ordenesRouter } from '../src/modules/ordenes/ordenes.routes.js';

const app = express();
app.use(express.json());
app.use('/api/ordenes', ordenesRouter);
app.use(manageErrors);
const datos = { cuadrillaId: 4, motivo: 'Asignación de cuadrilla' };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.rol = 'ADMIN'; mocks.autenticado = true;
    mocks.asignar.mockResolvedValue({ id: 8, numero: '80', estadoCodigo: 'ASIGNADA' });
});

describe('HTTP de asignaciones de órdenes', () => {
    it('permite asignar a ADMIN', async () => {
        const respuesta = await request(app).post('/api/ordenes/8/asignacion').send(datos);
        expect(respuesta.status).toBe(200);
        expect(mocks.asignar).toHaveBeenCalledWith(8, datos, 3);
    });

    it('permite asignar a GTE_OPE', async () => {
        mocks.rol = 'GTE_OPE';
        expect((await request(app).post('/api/ordenes/8/asignacion').send(datos)).status).toBe(200);
    });

    it('rechaza TEC', async () => {
        mocks.rol = 'TEC';
        expect((await request(app).post('/api/ordenes/8/asignacion').send(datos)).status).toBe(403);
        expect(mocks.asignar).not.toHaveBeenCalled();
    });

    it('rechaza usuario sin sesión', async () => {
        mocks.autenticado = false;
        expect((await request(app).post('/api/ordenes/8/asignacion').send(datos)).status).toBe(401);
    });

    it('rechaza body inválido y campos adicionales', async () => {
        expect((await request(app).post('/api/ordenes/8/asignacion').send({ ...datos, cuadrillaId: -1 })).status).toBe(400);
        expect((await request(app).post('/api/ordenes/8/asignacion').send({ ...datos, extra: true })).status).toBe(400);
        expect(mocks.asignar).not.toHaveBeenCalled();
    });

    it('rechaza ID inválido', async () => {
        expect((await request(app).post('/api/ordenes/abc/asignacion').send(datos)).status).toBe(400);
    });
});
