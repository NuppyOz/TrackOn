import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    listar: vi.fn(), listarDisponibles: vi.fn(), vincular: vi.fn(), registrarDiagnostico: vi.fn(),
    rol: 'ADMIN', autenticado: true,
}));
vi.mock('../src/modules/ordenes/ordenes.equipos.service.js', () => ({
    listar: mocks.listar,
    listarDisponibles: mocks.listarDisponibles,
    vincular: mocks.vincular,
    registrarDiagnostico: mocks.registrarDiagnostico,
}));
vi.mock('../src/middlewares/authenticate.js', () => ({
    authenticate: (req: Request, _res: Response, next: NextFunction) => {
        if (mocks.autenticado) Object.assign(req, {
            auth: { usuario: { id: 3, rol: { cod: mocks.rol }, empleado: { id: 9 } } },
        });
        next();
    },
}));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { ordenesRouter } from '../src/modules/ordenes/ordenes.routes.js';

const app = express();
app.use(express.json());
app.use('/api/ordenes', ordenesRouter);
app.use(manageErrors);

beforeEach(() => {
    vi.resetAllMocks();
    mocks.rol = 'ADMIN'; mocks.autenticado = true;
    mocks.listar.mockResolvedValue([]);
    mocks.listarDisponibles.mockResolvedValue([]);
    mocks.vincular.mockResolvedValue({ id: 15 });
    mocks.registrarDiagnostico.mockResolvedValue({ id: 15, diagnostico: 'Compresor defectuoso' });
});

describe('HTTP de equipos y diagnósticos de una OT', () => {
    it('permite consultar equipos a TEC', async () => {
        mocks.rol = 'TEC';
        expect((await request(app).get('/api/ordenes/4/equipos')).status).toBe(200);
        expect(mocks.listar).toHaveBeenCalledWith(4);
    });
    it('no permite consultar sin autenticación', async () => {
        mocks.autenticado = false;
        expect((await request(app).get('/api/ordenes/4/equipos')).status).toBe(401);
    });
    it('permite consultar equipos disponibles a ADMIN', async () => {
        expect((await request(app).get('/api/ordenes/4/equipos-disponibles')).status).toBe(200);
        expect(mocks.listarDisponibles).toHaveBeenCalledWith(4);
    });
    it('rechaza consulta de equipos disponibles para TEC', async () => {
        mocks.rol = 'TEC';
        expect((await request(app).get('/api/ordenes/4/equipos-disponibles')).status).toBe(403);
    });
    it('permite vincular equipo a GTE_OPE', async () => {
        mocks.rol = 'GTE_OPE';
        const r = await request(app).post('/api/ordenes/4/equipos').send({ equipoId: 11 });
        expect(r.status).toBe(201);
        expect(mocks.vincular).toHaveBeenCalledWith(4, 11);
    });
    it('prohíbe a TEC vincular equipo', async () => {
        mocks.rol = 'TEC';
        expect((await request(app).post('/api/ordenes/4/equipos').send({ equipoId: 11 })).status).toBe(403);
    });
    it('valida número positivo y rechaza campos extra', async () => {
        expect((await request(app).post('/api/ordenes/4/equipos').send({ equipoId: -1 })).status).toBe(400);
        expect((await request(app).post('/api/ordenes/4/equipos').send({ equipoId: 11, extra: 2 })).status).toBe(400);
    });
    it('guarda diagnóstico con contexto del actor', async () => {
        const datos = { diagnostico: 'Compresor presenta fuga de refrigerante' };
        const r = await request(app).patch('/api/ordenes/4/equipos/15/diagnostico').send(datos);
        expect(r.status).toBe(200);
        expect(mocks.registrarDiagnostico).toHaveBeenCalledWith(4, 15, datos, { id: 3, empleadoId: 9, rol: 'ADMIN' });
    });
    it('valida ID y longitud del diagnóstico', async () => {
        expect((await request(app).patch('/api/ordenes/4/equipos/abc/diagnostico').send({ diagnostico: 'Texto suficientemente largo' })).status).toBe(400);
        expect((await request(app).patch('/api/ordenes/4/equipos/15/diagnostico').send({ diagnostico: 'Corto' })).status).toBe(400);
    });
});
