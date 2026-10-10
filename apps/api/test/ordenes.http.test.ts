import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    crear: vi.fn(),
    listar: vi.fn(),
    obtener: vi.fn(),
    cambiarEstado: vi.fn(),
    rol: 'ADMIN',
    autenticado: true,
}));

vi.mock('../src/modules/ordenes/ordenes.service.js', () => ({
    crear: mocks.crear,
    listar: mocks.listar,
    obtener: mocks.obtener,
    cambiarEstado: mocks.cambiarEstado,
}));

// Se conserva el middleware authorize real: solo se sustituye la verificación criptográfica
// de authenticate para ejercitar los códigos 401/403 sin credenciales en los tests HTTP.
vi.mock('../src/middlewares/authenticate.js', () => ({
    authenticate: (req: Request, ...rest: [Response, NextFunction]) => {
        if (mocks.autenticado) {
            Object.assign(req, { auth: { usuario: { id: 9, rol: { cod: mocks.rol } } } });
        }
        rest[1]();
    },
}));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { ordenesRouter } from '../src/modules/ordenes/ordenes.routes.js';

const app = express();
app.use(express.json());
app.use('/api/ordenes', ordenesRouter);
app.use(manageErrors);

const orden = { id: 14, numero: '140', estadoCodigo: 'PENDIENTE', solicitud: 'Revisar el equipo' };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.autenticado = true;
    mocks.rol = 'ADMIN';
    mocks.crear.mockResolvedValue(orden);
    mocks.listar.mockResolvedValue({ items: [orden], pagina: 1, limite: 25, hayMas: false });
    mocks.obtener.mockResolvedValue(orden);
    mocks.cambiarEstado.mockResolvedValue({ ...orden, estadoCodigo: 'CANCELADA' });
});

describe('API de órdenes y permisos', () => {
    it('permite listar a un técnico autenticado', async () => {
        mocks.rol = 'TEC';
        const respuesta = await request(app).get('/api/ordenes');
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.items).toHaveLength(1);
        expect(mocks.listar).toHaveBeenCalledWith({ pagina: 1, limite: 25 });
    });

    it('impide consultar órdenes sin autenticación', async () => {
        mocks.autenticado = false;
        expect((await request(app).get('/api/ordenes')).status).toBe(401);
    });

    it('impide a TEC crear órdenes', async () => {
        mocks.rol = 'TEC';
        const respuesta = await request(app).post('/api/ordenes').send({ ubicacionId: 3, solicitud: 'Reparar equipo' });
        expect(respuesta.status).toBe(403);
        expect(mocks.crear).not.toHaveBeenCalled();
    });

    it('permite crear a un administrador', async () => {
        const respuesta = await request(app).post('/api/ordenes').send({ ubicacionId: 3, solicitud: 'Reparar equipo' });
        expect(respuesta.status).toBe(201);
        expect(mocks.crear).toHaveBeenCalledWith({
            ubicacionId: 3, solicitud: 'Reparar equipo', prioridad: 'MEDIA',
        }, 9);
    });

    it('rechaza una solicitud inválida con 400', async () => {
        const respuesta = await request(app).post('/api/ordenes').send({ ubicacionId: -1, solicitud: 'abc' });
        expect(respuesta.status).toBe(400);
        expect(mocks.crear).not.toHaveBeenCalled();
    });

    it('permite consultar el detalle de una orden', async () => {
        const respuesta = await request(app).get('/api/ordenes/14');
        expect(respuesta.status).toBe(200);
        expect(mocks.obtener).toHaveBeenCalledWith(14);
    });

    it('rechaza IDs inválidos', async () => {
        expect((await request(app).get('/api/ordenes/invalido')).status).toBe(400);
    });

    it('propaga un 404 cuando no hay orden', async () => {
        // Simulamos el error real de la capa de servicio.
        const { AppError } = await import('../src/errors/AppError.js');
        mocks.obtener.mockRejectedValue(new AppError(404, 'La orden no existe.'));
        const respuesta = await request(app).get('/api/ordenes/14');
        expect(respuesta.status).toBe(404);
    });

    it('permite transición de estado a GTE_OPE', async () => {
        mocks.rol = 'GTE_OPE';
        const respuesta = await request(app).patch('/api/ordenes/14/estado').send({
            estado: 'CANCELADA', motivo: 'Decisión del cliente',
        });
        expect(respuesta.status).toBe(200);
        expect(mocks.cambiarEstado).toHaveBeenCalledWith(14, {
            estado: 'CANCELADA', motivo: 'Decisión del cliente',
        }, 9);
    });

    it('impide transiciones desde el rol TEC', async () => {
        mocks.rol = 'TEC';
        const respuesta = await request(app).patch('/api/ordenes/14/estado').send({
            estado: 'CANCELADA', motivo: 'Cancelar trabajo',
        });
        expect(respuesta.status).toBe(403);
    });

    it('rechaza transiciones sin motivo', async () => {
        const respuesta = await request(app).patch('/api/ordenes/14/estado').send({
            estado: 'CANCELADA', motivo: '',
        });
        expect(respuesta.status).toBe(400);
    });
});
