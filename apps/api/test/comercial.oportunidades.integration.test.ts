import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
const auth = () => `Bearer ${fixture.tokens.ADMIN}`;
const call = (path: string, body?: object, method: 'get'|'post'|'patch' = 'post') => {
  const req = request(app)[method](`/api/comercial${path}`).set('Authorization', auth());
  return method === 'get' ? req : req.send(body ?? {});
};

beforeAll(async () => {
  fixture = await crearFixtureComercial('OPORT');
  const concept = await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio de prueba', tipo: 'SERVICIO', unidad: 'servicio' } });
  conceptoId = concept.id;
  await prisma.tarifaComercial.create({ data: { conceptoId, precio: '125.00' } });
});
afterAll(async () => {
  if (fixture) {
    const opps = await prisma.oportunidadComercial.findMany({ where: { clienteId: { in: fixture.clientes } }, select: { id: true } });
    const quoteIds = (await prisma.cotizacionComercial.findMany({ where: { oportunidadId: { in: opps.map(x => x.id) } }, select: { id: true } })).map(x => x.id);
    await prisma.ventaComercial.deleteMany({ where: { cotizacionId: { in: quoteIds } } });
    await prisma.notaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: quoteIds } } });
    await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: quoteIds } } });
    await prisma.cotizacionComercial.deleteMany({ where: { id: { in: quoteIds } } });
    await prisma.oportunidadComercial.deleteMany({ where: { id: { in: opps.map(x => x.id) } } });
    await prisma.tarifaComercial.deleteMany({ where: { conceptoId } });
    await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
    await limpiarFixtureComercial(fixture);
  }
  await prisma.$disconnect();
});

describe('Oportunidades comerciales persistidas e integradas', () => {
  it('autoriza, crea y controla las transiciones con versión e historial', async () => {
    expect((await request(app).get('/api/comercial/oportunidades')).status).toBe(401);
    expect((await request(app).get('/api/comercial/oportunidades').set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
    const created = await call('/oportunidades', { clienteId: fixture.clientes[0], nombre: 'Mantenimiento anual', valorEstimado: '500.00' });
    expect(created.status).toBe(201); const id = created.body.data.id;
    expect(created.body.data).toMatchObject({ clienteId: fixture.clientes[0], etapa: 'NUEVA', responsableId: fixture.usuarios[0], valorEstimado: '500.00' });
    expect((await request(app).get('/api/comercial/oportunidades?limite=10').set('Authorization', auth())).body.data).toMatchObject({ pagina: 1, limite: 10, items: [expect.objectContaining({ id })] });
    expect((await request(app).get(`/api/comercial/oportunidades/${id}`).set('Authorization', auth())).body.data.id).toBe(id);
    expect((await call(`/oportunidades/${id}`, { version: 1, etapa: 'PROPUESTA' }, 'patch')).status).toBe(409);
    const qualified = await call(`/oportunidades/${id}`, { version: 1, etapa: 'CALIFICADA' }, 'patch');
    expect(qualified.status).toBe(200); expect(qualified.body.data.etapa).toBe('CALIFICADA');
    expect((await call(`/oportunidades/${id}`, { version: 1, etapa: 'PERDIDA' }, 'patch')).status).toBe(409);
    expect(await prisma.auditoria.count({ where: { entidad: 'OPORTUNIDAD_COMERCIAL', entidadId: String(id), accion: 'ACTUALIZAR' } })).toBe(1);
  });

  it('vincula una cotización del mismo cliente y gana solo al convertir la venta', async () => {
    const created = await call('/oportunidades', { clienteId: fixture.clientes[0], nombre: 'Instalación equipo' });
    const id = created.body.data.id;
    const body = { clienteId: fixture.clientes[0], oportunidadId: id, venceEn: new Date(Date.now() + 86_400_000).toISOString(), lineas: [{ conceptoId, cantidad: '1.000', descuento: '0.00' }] };
    const quote = await request(app).post('/api/comercial/cotizaciones').set('Authorization', auth()).set('Idempotency-Key', randomUUID()).send(body);
    expect(quote.status).toBe(201); expect(quote.body.data.oportunidadId).toBe(id);
    expect((await prisma.oportunidadComercial.findUniqueOrThrow({ where: { id } })).etapa).toBe('PROPUESTA');
    const mismatch = await request(app).post('/api/comercial/cotizaciones').set('Authorization', auth()).set('Idempotency-Key', randomUUID()).send({ ...body, clienteId: fixture.clientes[1] });
    expect(mismatch.status).toBe(409);
    const sent = await request(app).post(`/api/comercial/cotizaciones/${quote.body.data.id}/enviar`).set('Authorization', auth()).set('Idempotency-Key', randomUUID()).send({ version: 1 });
    expect(sent.status).toBe(200);
    const decision = await request(app).post(`/api/comercial/cotizaciones/${quote.body.data.id}/decision`).set('Authorization', auth()).set('Idempotency-Key', randomUUID()).send({ version: 2, decision: 'APROBADA' });
    expect(decision.status).toBe(200);
    const sale = await request(app).post(`/api/comercial/cotizaciones/${quote.body.data.id}/convertir-venta`).set('Authorization', auth()).set('Idempotency-Key', randomUUID()).send({ version: 3 });
    expect(sale.status).toBe(201);
    expect((await prisma.oportunidadComercial.findUniqueOrThrow({ where: { id } })).etapa).toBe('GANADA');
    expect(await prisma.ventaComercial.count({ where: { cotizacionId: quote.body.data.id } })).toBe(1);
  });
});
