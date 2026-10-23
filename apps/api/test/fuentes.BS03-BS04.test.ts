import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let comprobanteId = 0;
let cobroId = 0;
let costoId = 0;
const raiz = '/api/fuentes-gerenciales/finanzas';
const post = (path: string, body: object, key = randomUUID()) => request(app).post(`${raiz}${path}`).set('Authorization', `Bearer ${fixture.tokens.ADMIN}`).set('Idempotency-Key', key).send(body);
const get = (path: string) => request(app).get(`${raiz}${path}`).set('Authorization', `Bearer ${fixture.tokens.ADMIN}`);

beforeAll(async () => {
  fixture = await crearFixtureComercial('BS03-04');
  const row = await prisma.comprobanteGerencial.create({ data: {
    clienteId: fixture.clientes[0]!, referencia: `${fixture.prefijo}-DOC`, emisor: 'PRUEBA',
    emitidaEn: new Date(Date.now() - 60_000), venceEn: new Date(Date.now() + 86_400_000), importeFinal: '100.00', autorId: fixture.usuarios[0]!,
    lineas: { create: { descripcion: 'Trabajo', importe: '100.00' } },
  } });
  comprobanteId = row.id;
});
afterAll(async () => {
  if (fixture) {
    if (cobroId) await prisma.aplicacionCobroGerencial.deleteMany({ where: { cobroId } });
    if (cobroId) await prisma.auditoria.deleteMany({ where: { entidad: 'CobroGerencial', entidadId: String(cobroId) } });
    if (costoId) await prisma.auditoria.deleteMany({ where: { entidad: 'CostoGerencial', entidadId: String(costoId) } });
    await prisma.operacionIdempotente.deleteMany({ where: { tipoActor: 'USUARIO', actorId: { in: fixture.usuarios } } });
    if (cobroId) await prisma.cobroGerencial.deleteMany({ where: { id: cobroId } });
    if (costoId) await prisma.costoGerencial.deleteMany({ where: { id: costoId } });
    if (comprobanteId) {
      await prisma.lineaComprobanteGerencial.deleteMany({ where: { comprobanteId } });
      await prisma.comprobanteGerencial.deleteMany({ where: { id: comprobanteId } });
    }
    await limpiarFixtureComercial(fixture);
  }
  await prisma.$disconnect();
});

describe('BS03–BS04 cobros y costos gerenciales', () => {
  it('aplica y revierte un cobro, conserva historial y deriva el cliente del costo', async () => {
    const fecha = new Date(Date.now() - 30_000).toISOString();
    const cobroBody = { clienteId: fixture.clientes[0], referencia: ` ${fixture.prefijo}-pago `, fechaEfectiva: fecha, aplicaciones: [{ comprobanteId, importe: '60.00' }] };
    const key = randomUUID();
    const creado = await post('/cobros', cobroBody, key);
    expect(creado.status).toBe(201);
    cobroId = creado.body.data.id;
    expect(creado.body.data).toMatchObject({ referencia: `${fixture.prefijo}-PAGO`.toUpperCase(), importe: '60.00', version: 1, aplicaciones: [{ comprobanteId, importe: '60.00' }] });
    expect((await post('/cobros', cobroBody, key)).body.data.id).toBe(cobroId);
    const saldo = await get(`/comprobantes/${comprobanteId}`);
    expect(saldo.body.data.saldo).toBe('40.00');

    const reverso = await post(`/cobros/${cobroId}/revertir`, { version: 1, fechaEfectiva: new Date().toISOString(), motivo: 'Corrección de prueba' });
    expect(reverso.status).toBe(200);
    expect(reverso.body.data).toMatchObject({ version: 2, motivoReversion: 'Corrección de prueba' });
    expect((await get(`/comprobantes/${comprobanteId}`)).body.data.saldo).toBe('100.00');

    const costo = await post('/costos', { referencia: `${fixture.prefijo}-costo`, fechaEfectiva: fecha, categoria: 'MATERIAL', importe: '12.5', comprobanteId });
    expect(costo.status).toBe(201);
    costoId = costo.body.data.id;
    expect(costo.body.data).toMatchObject({ clienteId: fixture.clientes[0], comprobanteId, comprobanteReferencia: `${fixture.prefijo}-DOC`, importe: '12.50' });
    expect((await post(`/costos/${costoId}/revertir`, { version: 1, fechaEfectiva: new Date().toISOString(), motivo: 'Corrección de prueba' })).status).toBe(200);
    expect((await get('/costos?limite=10')).body.data.items.some((x: { id: number }) => x.id === costoId)).toBe(true);
  });

  it('rechaza aplicaciones duplicadas y vínculos de costo incoherentes', async () => {
    const fecha = new Date(Date.now() - 20_000).toISOString();
    const base = { clienteId: fixture.clientes[0], referencia: `${fixture.prefijo}-INVALIDO`, fechaEfectiva: fecha, aplicaciones: [{ comprobanteId, importe: '10.00' }, { comprobanteId, importe: '10.00' }] };
    expect((await post('/cobros', base)).status).toBe(400);
    expect((await post('/costos', { referencia: `${fixture.prefijo}-AJENO`, fechaEfectiva: fecha, categoria: 'OTRO', importe: '1.00', clienteId: fixture.clientes[1], comprobanteId })).status).toBe(400);
  });
});
