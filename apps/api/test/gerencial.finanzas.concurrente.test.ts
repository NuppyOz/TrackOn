import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let f: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
const raiz = '/api/fuentes-gerenciales/finanzas';
const post = (ruta: string, body: object) => request(app).post(raiz + ruta).set('Authorization', `Bearer ${f.tokens.ADMIN}`).set('Idempotency-Key', randomUUID()).send(body);
const get = (ruta: string) => request(app).get(raiz + ruta).set('Authorization', `Bearer ${f.tokens.ADMIN}`);
beforeAll(async () => {
    f = await crearFixtureComercial('FIN-CONC');
    conceptoId = (await prisma.conceptoComercial.create({ data: { codigo: f.prefijo, nombre: 'Servicio de prueba concurrente', tipo: 'SERVICIO', unidad: 'hora' } })).id;
});
afterAll(async () => {
    if (f) {
        await prisma.aplicacionFacturableGerencial.deleteMany({ where: { facturable: { autorId: { in: f.usuarios } } } });
        await prisma.facturableGerencial.deleteMany({ where: { autorId: { in: f.usuarios } } });
        await prisma.aplicacionCobroGerencial.deleteMany({ where: { cobro: { autorId: { in: f.usuarios } } } });
        await prisma.cobroGerencial.deleteMany({ where: { autorId: { in: f.usuarios } } });
        await prisma.lineaComprobanteGerencial.deleteMany({ where: { comprobante: { autorId: { in: f.usuarios } } } });
        await prisma.comprobanteGerencial.deleteMany({ where: { autorId: { in: f.usuarios } } });
        if (conceptoId) await prisma.conceptoComercial.delete({ where: { id: conceptoId } });
        await limpiarFixtureComercial(f);
    }
    await prisma.$disconnect();
});
it('protege permisos, suma documental, cliente y sobreaplicación concurrente sin perder historia', async () => {
    const docBody = { clienteId: f.clientes[0], referencia: `${f.prefijo}-DOC`, emisor: 'PRUEBA', emitidaEn: '2002-01-01T00:00:00Z', venceEn: '2002-01-05T00:00:00Z', importeFinal: '100.00', lineas: [{ descripcion: 'Trabajo', importe: '100.00', conceptoId }] };
    expect((await request(app).get(raiz + '/comprobantes')).status).toBe(401);
    expect((await request(app).get(raiz + '/comprobantes').set('Authorization', `Bearer ${f.tokens.TEC}`)).status).toBe(403);
    expect((await post('/comprobantes', { ...docBody, importeFinal: '99.99' })).status).toBe(400);
    const creado = await post('/comprobantes', docBody);
    expect(creado.status).toBe(201);
    const documento = creado.body.data;
    const crearServicio = (clienteId: number, suffix: string) => post('/facturables', { clienteId, conceptoId, referencia: `${f.prefijo}-${suffix}`, fechaEfectiva: '2002-01-02T00:00:00Z', cantidad: '1.500' });
    const ajeno = await crearServicio(f.clientes[1]!, 'AJENO');
    expect(ajeno.status).toBe(201);
    const aplicacion = { lineaComprobanteId: documento.lineas[0].id, fechaEfectiva: '2002-01-03T00:00:00Z', cantidad: '1.000' };
    expect((await post(`/facturables/${ajeno.body.data.id}/aplicar`, aplicacion)).status).toBe(400);
    const servicio = await crearServicio(f.clientes[0]!, 'SERVICIO');
    expect(servicio.status).toBe(201);
    const ruta = `/facturables/${servicio.body.data.id}`;
    expect((await post(ruta + '/aplicar', { ...aplicacion, cantidad: '0.500' })).status).toBe(200);
    const carrera = await Promise.all([post(ruta + '/aplicar', aplicacion), post(ruta + '/aplicar', aplicacion)]);
    expect(carrera.map(r => r.status).sort()).toEqual([200, 409]);
    expect((await get(ruta)).body.data.pendiente).toBe('0.000');
    expect((await post(`/comprobantes/${documento.id}/anular`, { version: 1, fechaEfectiva: '2002-01-02T12:00:00Z', motivo: 'Antes de aplicar' })).status).toBe(400);
    const anulado = await post(`/comprobantes/${documento.id}/anular`, { version: 1, fechaEfectiva: '2002-01-04T00:00:00Z', motivo: 'Corrección documentada' });
    expect(anulado.status).toBe(200);
    expect(anulado.body.data.saldo).toBe('0.00');
    const restaurado = (await get(ruta)).body.data;
    expect(restaurado.pendiente).toBe('1.500');
    expect(restaurado.aplicaciones).toHaveLength(2);
    expect((await post(ruta + '/aplicar', aplicacion)).status).toBe(409);
});

it('evita sobrecobro en paralelo y rechaza cobros anteriores a una reversión posterior', async () => {
    const creado = await post('/comprobantes', { clienteId: f.clientes[0], referencia: `${f.prefijo}-COBRO`, emisor: 'PRUEBA', emitidaEn: '2002-02-01T00:00:00Z', venceEn: '2002-02-05T00:00:00Z', importeFinal: '100.00', lineas: [{ descripcion: 'Trabajo documentado', importe: '100.00' }] });
    expect(creado.status).toBe(201);
    const id = creado.body.data.id;
    const body = { clienteId: f.clientes[0], referencia: `${f.prefijo}-PAGO1`, fechaEfectiva: '2002-02-02T00:00:00Z', aplicaciones: [{ comprobanteId: id, importe: '60.00' }] };
    const carrera = await Promise.all([post('/cobros', body), post('/cobros', { ...body, referencia: `${f.prefijo}-PAGO2` })]);
    expect(carrera.map(r => r.status).sort()).toEqual([201, 409]);
    expect((await get(`/comprobantes/${id}`)).body.data.saldo).toBe('40.00');
    const pago = carrera.find(r => r.status === 201)!.body.data;
    expect((await post(`/comprobantes/${id}/anular`, { version: 1, fechaEfectiva: '2002-02-04T00:00:00Z', motivo: 'No puede anular con pago' })).status).toBe(409);
    expect((await post(`/cobros/${pago.id}/revertir`, { version: 1, fechaEfectiva: '2002-02-03T00:00:00Z', motivo: 'Pago duplicado' })).status).toBe(200);
    expect((await post('/cobros', { ...body, referencia: `${f.prefijo}-RETROACTIVO`, fechaEfectiva: '2002-02-02T12:00:00Z' })).status).toBe(400);
    expect((await post('/cobros', { ...body, referencia: `${f.prefijo}-AJENO`, clienteId: f.clientes[1], fechaEfectiva: '2002-02-04T00:00:00Z' })).status).toBe(400);
    expect((await get(`/comprobantes/${id}`)).body.data.saldo).toBe('100.00');
});
