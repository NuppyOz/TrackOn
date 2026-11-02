import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    cotizacionComercial: { findUnique: vi.fn() },
    ventaComercial: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), findMany: vi.fn() },
}));

vi.mock('../src/infrastructure/prisma.js', () => ({ prisma: db }));
vi.mock('../src/infrastructure/idempotencia.js', () => ({
    claveIdempotencia: vi.fn((value: string) => value),
    ejecutarIdempotente: vi.fn(async (_actor, _operation, _key, _payload, callback) => callback(db)),
}));

import type { AuthContext } from '../src/types/express.js';
import { manageErrors } from '../src/middlewares/error-handler.js';
import { ventasRouter } from '../src/modules/comercial/ventas/ventas.routes.js';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.auth = { sesionId: 1, usuario: { id: 55, identificador: 'admin', rol: { id: 1, cod: 'ADMIN', nombre: 'Admin' }, empleado: { id: 2, codEmpleado: 'E-2', active: true, habilitadoComoTecnico: false, persona: { firstName: 'Ada', secondName: null, firstLastName: 'Lovelace', secondLastName: null } } } } satisfies AuthContext;
    next();
});
app.use('/api/comercial', ventasRouter);
app.use(manageErrors);

const venta = {
    id: 6, cotizacionId: 4, clienteId: 3, moneda: 'NIO', total: '22.50', confirmadaEn: new Date('2026-10-20T12:00:00.000Z'),
    cotizacion: { clienteNombreRegistrado: 'Cliente Uno', lineas: [
        { id: 17, descripcion: 'Mantenimiento', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.500', precio: '15.00', descuento: '0.00', subtotal: '22.50', total: '22.50' },
    ] },
    confirmadaPor: { id: 55, identificador: 'admin', empleado: { persona: { firstName: 'Ada', secondName: null, firstLastName: 'Lovelace', secondLastName: null } } },
};

describe('BE08 ventas', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.cotizacionComercial.findUnique.mockResolvedValue({ id: 4, clienteId: 3, estado: 'APROBADA', version: 7, moneda: 'NIO', total: '22.50' });
        db.ventaComercial.findUnique.mockResolvedValue(null);
        db.ventaComercial.findUniqueOrThrow.mockResolvedValue(venta);
        db.ventaComercial.create.mockResolvedValue({ id: 6 });
        db.ventaComercial.findMany.mockResolvedValue([]);
    });

    it('convierte una cotización aprobada y responde DTO de venta, sin cambiar versión ni responder cotización', async () => {
        const response = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta')
            .set('Idempotency-Key', 'venta-intencion-0001').send({ version: 7 });
        expect(response.status).toBe(201);
        expect(response.body.data).toEqual({
            id: 6, cotizacionId: 4, clienteId: 3, clienteNombreRegistrado: 'Cliente Uno', moneda: 'NIO', total: '22.50', confirmadaEn: '2026-10-20T12:00:00.000Z',
        });
        expect(response.body.data.estadoPersistido).toBeUndefined();
        expect(db.ventaComercial.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cotizacionId: 4, clienteId: 3, confirmadaPorId: 55, moneda: 'NIO', total: '22.50' }) }));
        expect(db.cotizacionComercial.findUnique).toHaveBeenCalledTimes(1);
    });

    it('si ya existe venta la devuelve aunque la clave sea nueva y la versión esté obsoleta', async () => {
        db.ventaComercial.findUnique.mockResolvedValueOnce(venta);
        const response = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta')
            .set('Idempotency-Key', 'venta-intencion-nueva').send({ version: 1 });
        expect(response.status).toBe(201);
        expect(response.body.data.id).toBe(6);
        expect(db.cotizacionComercial.findUnique).not.toHaveBeenCalled();
        expect(db.ventaComercial.create).not.toHaveBeenCalled();
    });

    it('rechaza cotización no aprobada, versión obsoleta y falta de Idempotency-Key', async () => {
        db.cotizacionComercial.findUnique.mockResolvedValueOnce({ id: 4, clienteId: 3, estado: 'ENVIADA', version: 7, moneda: 'NIO', total: '22.50' });
        const estado = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta').set('Idempotency-Key', 'venta-intencion-0001').send({ version: 7 });
        expect(estado.status).toBe(409);

        db.cotizacionComercial.findUnique.mockResolvedValueOnce({ id: 4, clienteId: 3, estado: 'APROBADA', version: 8, moneda: 'NIO', total: '22.50' });
        const version = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta').set('Idempotency-Key', 'venta-intencion-0002').send({ version: 7 });
        expect(version.status).toBe(409);

        const key = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta').send({ version: 7 });
        expect(key.status).toBe(400);
    });

    it('listado filtra en base y detalle devuelve líneas quote con escala fija', async () => {
        db.ventaComercial.findMany.mockResolvedValueOnce([{ id: 6, cotizacionId: 4, clienteId: 3, moneda: 'NIO', total: '22.5', confirmadaEn: venta.confirmadaEn, cotizacion: { clienteNombreRegistrado: 'Cliente Uno' } }]);
        const list = await request(app).get('/api/comercial/ventas?q=cliente&clienteId=3&pagina=2&limite=5&sortBy=confirmadaEn&sortDir=asc');
        expect(list.status).toBe(200);
        expect(list.body.data.items[0]).toEqual({ id: 6, cotizacionId: 4, clienteId: 3, clienteNombreRegistrado: 'Cliente Uno', moneda: 'NIO', total: '22.50', confirmadaEn: '2026-10-20T12:00:00.000Z' });
        expect(db.ventaComercial.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 6, orderBy: [{ confirmadaEn: 'asc' }, { id: 'asc' }] }));

        db.ventaComercial.findUnique.mockResolvedValueOnce(venta);
        const detail = await request(app).get('/api/comercial/ventas/6');
        expect(detail.status).toBe(200);
        expect(detail.body.data.confirmadaPor).toEqual({ id: 55, nombre: 'Ada Lovelace' });
        expect(detail.body.data.lineas[0]).toEqual({ id: 17, descripcion: 'Mantenimiento', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.500', precio: '15.00', descuento: '0.00', subtotal: '22.50', total: '22.50' });
    });

    it('recupera una venta confirmada tras conflicto de serialización y limita filtros', async () => {
        const idempotencia = await import('../src/infrastructure/idempotencia.js');
        vi.mocked(idempotencia.ejecutarIdempotente).mockRejectedValueOnce({ code: 'P2034' });
        db.ventaComercial.findUnique.mockResolvedValue(venta);
        const recovered = await request(app).post('/api/comercial/cotizaciones/4/convertir-venta')
            .set('Idempotency-Key', 'venta-intencion-0003').send({ version: 7 });
        expect(recovered.status).toBe(201);
        expect(recovered.body.data.id).toBe(6);
        expect((await request(app).get('/api/comercial/ventas?estado=APROBADA')).status).toBe(400);
    });
});
