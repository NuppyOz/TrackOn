import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ cliente: { findUnique: vi.fn() }, $queryRaw: vi.fn() }));
vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: db }));

import { manageErrors } from '../src/middlewares/error-handler.js';
import { historialComercialRouter } from '../src/modules/comercial/crm/historial/historial.routes.js';

const app = express();
app.use(express.json());
app.use('/api/comercial/clientes/:clienteId', historialComercialRouter);
app.use(manageErrors);

describe('BE12 historial comercial', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.cliente.findUnique.mockResolvedValue({ id: 5 });
        db.$queryRaw.mockResolvedValue([{ id: 'VENTA:4', tipo: 'VENTA', fecha: new Date('2026-10-20T12:00:00.000Z'), titulo: 'Venta #4', descripcion: 'Venta registrada', referenciaId: 4 }]);
    });

    it('devuelve historial acotado al cliente y con el DTO congelado', async () => {
        const response = await request(app).get('/api/comercial/clientes/5/historial?q=venta&tipo=VENTA&pagina=2&limite=10');
        expect(response.status).toBe(200);
        expect(response.body.data).toEqual({
            items: [{ id: 'VENTA:4', tipo: 'VENTA', fecha: '2026-10-20T12:00:00.000Z', titulo: 'Venta #4', descripcion: 'Venta registrada', referenciaId: 4 }],
            pagina: 2, limite: 10, hayMas: false, alcance: 'COMERCIAL',
        });
        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('rechaza tipos o filtros desconocidos y valida cliente inexistente', async () => {
        expect((await request(app).get('/api/comercial/clientes/5/historial?tipo=SERVICIO')).status).toBe(400);
        expect((await request(app).get('/api/comercial/clientes/5/historial?estado=abierto')).status).toBe(400);
        db.cliente.findUnique.mockResolvedValueOnce(null);
        expect((await request(app).get('/api/comercial/clientes/999/historial')).status).toBe(404);
        expect(db.$queryRaw).not.toHaveBeenCalled();
    });
});
