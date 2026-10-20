import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
let tarifaId: number;
let cotizacionId: number;
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;
const post = (ruta: string, body: object, key = randomUUID()) => request(app).post(`/api/comercial/cotizaciones${ruta}`)
    .set('Authorization', bearer()).set('Idempotency-Key', key).send(body);
beforeAll(async () => {
    fixture = await crearFixtureComercial('COTIZ');
    const concepto = await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio original', tipo: 'SERVICIO', unidad: 'servicio' } });
    conceptoId = concepto.id;
    tarifaId = (await prisma.tarifaComercial.create({ data: { conceptoId, precio: '10.25' } })).id;
});
afterAll(async () => {
    if (fixture) {
        const ids = (await prisma.cotizacionComercial.findMany({ where: { clienteId: { in: fixture.clientes } }, select: { id: true } })).map(x => x.id);
        await prisma.notaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.cotizacionComercial.deleteMany({ where: { id: { in: ids } } });
        await prisma.tarifaComercial.deleteMany({ where: { conceptoId } });
        await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});

describe('Cotizaciones con PostgreSQL y precios registrados', () => {
    it('autoriza, conserva precisión y repite una creación sin duplicarla', async () => {
        expect((await request(app).get('/api/comercial/cotizaciones')).status).toBe(401);
        expect((await request(app).get('/api/comercial/cotizaciones').set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
        const body = { clienteId: fixture.clientes[0], venceEn: new Date(Date.now() + 86_400_000).toISOString(), lineas: [{ conceptoId, cantidad: '1.500', descuento: '0.38' }] };
        const key = randomUUID();
        const created = await post('', body, key);
        expect(created.status).toBe(201); cotizacionId = created.body.data.id;
        expect(created.body.data).toMatchObject({ subtotal: '15.38', descuento: '0.38', total: '15.00', estadoPersistido: 'BORRADOR' });
        expect((await post('', body, key)).body.data).toEqual(created.body.data);
        expect((await post('', { ...body, nota: 'Otra intención' }, key)).status).toBe(409);
        expect(await prisma.cotizacionComercial.count({ where: { clienteId: fixture.clientes[0] } })).toBe(1);
    });
    it('editar cabecera y enviar no recalcula precios ni permite editar después', async () => {
        await prisma.tarifaComercial.update({ where: { id: tarifaId }, data: { precio: '99.00' } });
        await prisma.conceptoComercial.update({ where: { id: conceptoId }, data: { nombre: 'Servicio renombrado' } });
        const edit = await request(app).patch(`/api/comercial/cotizaciones/${cotizacionId}`).set('Authorization', bearer()).send({ version: 1, nota: 'Cabecera corregida' });
        expect(edit.status).toBe(200); expect(edit.body.data.lineas[0]).toMatchObject({ precio: '10.25', descripcion: 'Servicio original' });
        const key = randomUUID();
        const sent = await post(`/${cotizacionId}/enviar`, { version: 2 }, key);
        expect(sent.status).toBe(200); expect(sent.body.data.total).toBe('15.00');
        expect((await post(`/${cotizacionId}/enviar`, { version: 2 }, key)).body.data).toEqual(sent.body.data);
        expect((await request(app).patch(`/api/comercial/cotizaciones/${cotizacionId}`).set('Authorization', bearer()).send({ version: 3, nota: 'Cambio prohibido' })).status).toBe(409);
    });
    it('dos decisiones simultáneas solo confirman una y no duplican el historial', async () => {
        const results = await Promise.all(['APROBADA', 'RECHAZADA'].map(decision => post(`/${cotizacionId}/decision`, { version: 3, decision })));
        expect(results.map(x => x.status).sort()).toEqual([200, 409]);
        const row = await prisma.cotizacionComercial.findUniqueOrThrow({ where: { id: cotizacionId } });
        expect(row.version).toBe(4); expect(row.decisionOrigen).toBe('INTERNO'); expect(row.decisionUsuarioId).toBe(fixture.usuarios[0]);
        const key = randomUUID();
        const note = await post(`/${cotizacionId}/notas`, { texto: 'Seguimiento documentado' }, key);
        expect(note.status).toBe(201);
        expect((await post(`/${cotizacionId}/notas`, { texto: 'Seguimiento documentado' }, key)).body.data).toEqual(note.body.data);
        expect(await prisma.notaCotizacionComercial.count({ where: { cotizacionId } })).toBe(1);
    });
    it('filtra el vencimiento efectivo antes de paginar y rechaza decisiones tardías', async () => {
        const creada = await post('', { clienteId: fixture.clientes[1], venceEn: new Date(Date.now() + 86_400_000).toISOString(), lineas: [{ conceptoId, cantidad: '1.000', descuento: '0.00' }] });
        expect(creada.status).toBe(201);
        const id = creada.body.data.id;
        expect((await post(`/${id}/enviar`, { version: 1 })).status).toBe(200);
        await prisma.cotizacionComercial.update({ where: { id }, data: { venceEn: new Date(Date.now() - 1000) } });
        const expired = await request(app).get(`/api/comercial/cotizaciones?estado=VENCIDA&clienteId=${fixture.clientes[1]}&limite=1`).set('Authorization', bearer());
        expect(expired.status).toBe(200); expect(expired.body.data.items.map((x: { id: number }) => x.id)).toEqual([id]);
        expect(expired.body.data.items[0].estadoEfectivo).toBe('VENCIDA');
        expect((await post(`/${id}/decision`, { version: 2, decision: 'APROBADA' })).status).toBe(409);
    });
});
