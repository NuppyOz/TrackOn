import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    rol: 'TEC',
    findFirst: vi.fn(),
    listar: vi.fn(),
    obtener: vi.fn(),
}));
vi.mock('../src/infrastructure/prisma.js', () => ({
    prisma: { ordenTrabajo: { findFirst: mocks.findFirst } },
}));
vi.mock('../src/middlewares/authenticate.js', () => ({
    authenticate: (req: Request, _res: Response, next: NextFunction) => {
        Object.assign(req, { auth: {
            usuario: { id: 10, empleado: { id: 20 }, rol: { cod: mocks.rol } },
        } });
        next();
    },
}));
vi.mock('../src/modules/ordenes/ordenes.service.js', () => ({
    listar: mocks.listar,
    obtener: mocks.obtener,
}));

import { ordenesRouter } from '../src/modules/ordenes/ordenes.routes.js';
import { manageErrors } from '../src/middlewares/error-handler.js';

const app = express();
app.use(express.json());
app.use('/api/ordenes', ordenesRouter);
app.use(manageErrors);

beforeEach(() => {
    vi.resetAllMocks();
    mocks.rol = 'TEC';
    mocks.findFirst.mockResolvedValue({ id: 8 });
    mocks.listar.mockResolvedValue({ items: [], pagina: 1, limite: 10, hayMas: false });
    mocks.obtener.mockResolvedValue({ id: 8, numero: '8', estadoCodigo: 'ASIGNADA' });
});

describe('Visibilidad de órdenes por asignación del técnico', () => {
    it('limita el listado al actor autenticado en vez de usar una consulta compartida', async () => {
        const respuesta = await request(app).get('/api/ordenes?pagina=1&limite=10');
        expect(respuesta.status).toBe(200);
        expect(mocks.listar).toHaveBeenCalledWith(
            expect.objectContaining({ pagina: 1 }),
            expect.objectContaining({ rol: 'TEC', empleadoId: 20 }),
        );
    });

    it('permite ver el detalle de una orden activa asignada', async () => {
        expect((await request(app).get('/api/ordenes/8')).status).toBe(200);
        expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                id: 8,
                estadoCodigo: { in: ['ASIGNADA', 'EN_EJECUCION', 'EN_REVISION'] },
                asignaciones: expect.objectContaining({ some: expect.objectContaining({ fin: null }) }),
            }),
        }));
    });

    it('rechaza detalle ajeno sin consultar ni devolver sus datos', async () => {
        mocks.findFirst.mockResolvedValue(null);
        const respuesta = await request(app).get('/api/ordenes/9');
        expect(respuesta.status).toBe(404);
        expect(mocks.obtener).not.toHaveBeenCalled();
    });

    it('rechaza también recursos anidados de una orden ajena', async () => {
        mocks.findFirst.mockResolvedValue(null);
        expect((await request(app).get('/api/ordenes/9/equipos')).status).toBe(404);
        expect((await request(app).get('/api/ordenes/9/equipos/5/evidencias')).status).toBe(404);
    });
});
