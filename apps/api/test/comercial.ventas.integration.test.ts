import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
let cotizacionId: number;
let ventaId: number;
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;
const post = (path: string, body: object, key = randomUUID()) => request(app).post(`/api/comercial${path}`).set('Authorization', bearer()).set('Idempotency-Key', key).send(body);
beforeAll(async () => {
    fixture = await crearFixtureComercial('VENTA');
    conceptoId = (await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio vendido', tipo: 'SERVICIO', unidad: 'servicio' } })).id;
    await prisma.tarifaComercial.create({ data: { conceptoId, precio: '100.25' } });
    const creada = await post('/cotizaciones', { clienteId: fixture.clientes[0], venceEn: new Date(Date.now() + 86_400_000).toISOString(), lineas: [{ conceptoId, cantidad: '2.000', descuento: '0.50' }] });
    expect(creada.status).toBe(201); cotizacionId = creada.body.data.id;
    expect((await post(`/cotizaciones/${cotizacionId}/enviar`, { version: 1 })).status).toBe(200);
    expect((await post(`/cotizaciones/${cotizacionId}/decision`, { version: 2, decision: 'APROBADA' })).status).toBe(200);
});
afterAll(async () => {
    if (fixture) {
        const ids = (await prisma.cotizacionComercial.findMany({ where: { clienteId: { in: fixture.clientes } }, select: { id: true } })).map(x => x.id);
        await prisma.ventaComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.notaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.cotizacionComercial.deleteMany({ where: { id: { in: ids } } });
        await prisma.notaComercial.deleteMany({ where: { clienteId: { in: fixture.clientes } } });
        await prisma.tarifaComercial.deleteMany({ where: { conceptoId } });
        await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});
describe('Venta única y trazabilidad comercial reales', () => {
    it('convierte una sola vez incluso con claves concurrentes distintas', async () => {
        const keys = [randomUUID(), randomUUID()];
        const results = await Promise.all(keys.map(key => post(`/cotizaciones/${cotizacionId}/convertir-venta`, { version: 3 }, key)));
        expect(results.map(x => x.status).every(x => x === 200 || x === 201 || x === 409)).toBe(true);
        const ok = results.find(x => x.status === 200 || x.status === 201);
        expect(ok).toBeDefined(); ventaId = ok!.body.data.id;
        for (let index = 0; index < results.length; index++) {
            if (results[index]!.status < 300) expect((await post(`/cotizaciones/${cotizacionId}/convertir-venta`, { version: 999 }, keys[index])).status).toBe(409);
        }
        const repeated = await post(`/cotizaciones/${cotizacionId}/convertir-venta`, { version: 3 });
        expect(repeated.status).toBeLessThan(300); expect(repeated.body.data.id).toBe(ventaId);
        expect(await prisma.ventaComercial.count({ where: { cotizacionId } })).toBe(1);
        expect(repeated.body.data.total).toBe('200.00');
    });
    it('consulta venta con valores históricos y roles correctos', async () => {
        expect((await request(app).get('/api/comercial/ventas')).status).toBe(401);
        expect((await request(app).get('/api/comercial/ventas').set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
        await prisma.conceptoComercial.update({ where: { id: conceptoId }, data: { nombre: 'Nombre cambiado' } });
        const detail = await request(app).get(`/api/comercial/ventas/${ventaId}`).set('Authorization', bearer());
        expect(detail.status).toBe(200); expect(detail.body.data).toMatchObject({ total: '200.00', cotizacionId, clienteId: fixture.clientes[0] });
        expect(detail.body.data.lineas[0]).toMatchObject({ descripcion: 'Servicio vendido', cantidad: '2.000', precio: '100.25', descuento: '0.50' });
        const quote = await request(app).get(`/api/comercial/cotizaciones/${cotizacionId}`).set('Authorization', bearer());
        expect(quote.body.data.accionesPermitidas.convertirVenta).toBe(false); expect(quote.body.data.ventaId).toBe(ventaId);
    });
    it('no convierte borradores y muestra solo historial del cliente seleccionado', async () => {
        const draft = await post('/cotizaciones', { clienteId: fixture.clientes[1], venceEn: new Date(Date.now() + 86_400_000).toISOString(), lineas: [] });
        expect((await post(`/cotizaciones/${draft.body.data.id}/convertir-venta`, { version: 1 })).status).toBe(409);
        await prisma.notaComercial.create({ data: { clienteId: fixture.clientes[0], autorId: fixture.usuarios[0]!, texto: 'Seguimiento de la venta' } });
        const history = await request(app).get(`/api/comercial/clientes/${fixture.clientes[0]}/historial?limite=10`).set('Authorization', bearer());
        expect(history.status).toBe(200); expect(history.body.data.alcance).toBe('COMERCIAL');
        expect(history.body.data.items.map((x: {tipo:string}) => x.tipo).sort()).toEqual(['COTIZACION', 'NOTA', 'VENTA']);
        const filtered = await request(app).get(`/api/comercial/clientes/${fixture.clientes[0]}/historial?tipo=VENTA&limite=1`).set('Authorization', bearer());
        expect(filtered.body.data.items).toHaveLength(1); expect(filtered.body.data.items[0].referenciaId).toBe(ventaId);
    });
});
