import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
let cotizacionId: number;
let lineaId: number;
let ventaId: number;
let comprobanteId: number;
let facturableId: number;
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;
const post = (path: string, body: object, key = randomUUID()) => request(app).post(`/api/fuentes-gerenciales/finanzas${path}`).set('Authorization', bearer()).set('Idempotency-Key', key).send(body);

beforeAll(async () => {
  fixture = await crearFixtureComercial('BS02');
  const concepto = await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio BS02', tipo: 'SERVICIO', unidad: 'hora' } });
  conceptoId = concepto.id;
  const cotizacion = await prisma.cotizacionComercial.create({ data: {
    clienteId: fixture.clientes[0]!, creadaPorId: fixture.usuarios[0]!, clienteNombreRegistrado: fixture.prefijo,
    estado: 'APROBADA', subtotal: '125.00', descuento: '0.00', total: '125.00', venceEn: new Date(Date.now() + 86_400_000),
    enviadaEn: new Date(Date.now() - 86_400_000), decididaEn: new Date(Date.now() - 43_200_000), decisionOrigen: 'INTERNO', decisionUsuarioId: fixture.usuarios[0]!,
    lineas: { create: { conceptoId, posicion: 1, descripcion: 'Servicio BS02', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.250', precio: '100.00', descuento: '0.00', subtotal: '125.00', total: '125.00' } },
  }, include: { lineas: true } });
  cotizacionId = cotizacion.id;
  lineaId = cotizacion.lineas[0]!.id;
  ventaId = (await prisma.ventaComercial.create({ data: { cotizacionId, clienteId: fixture.clientes[0]!, confirmadaPorId: fixture.usuarios[0]!, total: '125.00' } })).id;
});

afterAll(async () => {
  if (fixture) {
    if (facturableId) await prisma.aplicacionFacturableGerencial.deleteMany({ where: { facturableId } });
    if (facturableId) await prisma.facturableGerencial.deleteMany({ where: { id: facturableId } });
    if (comprobanteId) {
      await prisma.auditoria.deleteMany({ where: { entidad: 'ComprobanteGerencial', entidadId: String(comprobanteId) } });
      await prisma.lineaComprobanteGerencial.deleteMany({ where: { comprobanteId } });
      await prisma.comprobanteGerencial.deleteMany({ where: { id: comprobanteId } });
    }
    if (ventaId) await prisma.ventaComercial.deleteMany({ where: { id: ventaId } });
    if (cotizacionId) {
      await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId } });
      await prisma.cotizacionComercial.deleteMany({ where: { id: cotizacionId } });
    }
    if (conceptoId) await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
    await limpiarFixtureComercial(fixture);
  }
  await prisma.$disconnect();
});

describe('BS02 comprobantes externos y servicios facturables', () => {
  it('normaliza, idempotencia y protege la cantidad pendiente con transacciones', async () => {
    const emitidaEn = new Date(Date.now() - 86_400_000).toISOString();
    const body = { clienteId: fixture.clientes[0], referencia: `  ${fixture.prefijo}-doc  `, emisor: ' proveedor bs02 ', emitidaEn, venceEn: emitidaEn, importeFinal: '125.00', lineas: [{ descripcion: 'Trabajo realizado', importe: '125.00', conceptoId }] };
    const key = randomUUID();
    const created = await post('/comprobantes', body, key);
    expect(created.status).toBe(201);
    comprobanteId = created.body.data.id;
    expect(created.body.data).toMatchObject({ referencia: `${fixture.prefijo}-DOC`.toUpperCase(), emisor: 'PROVEEDOR BS02', importeFinal: '125.00', saldo: '125.00', version: 1, moneda: 'NIO' });
    expect((await post('/comprobantes', body, key)).body.data.id).toBe(comprobanteId);
    expect((await post('/comprobantes', { ...body, importeFinal: '124.00' }, key)).status).toBe(409);

    const fechaServicio = new Date(Date.now() - 43_200_000).toISOString();
    const actividad = { clienteId: fixture.clientes[0], conceptoId, referencia: `${fixture.prefijo}-SERVICIO`, fechaEfectiva: fechaServicio, cantidad: '1.250', ventaId, lineaCotizacionId: lineaId };
    const service = await post('/facturables', actividad);
    expect(service.status).toBe(201);
    facturableId = service.body.data.id;
    expect(service.body.data).toMatchObject({ cantidad: '1.250', pendiente: '1.250', unidad: 'hora', lineaCotizacionId: lineaId });

    const detail = await request(app).get(`/api/fuentes-gerenciales/finanzas/comprobantes/${comprobanteId}`).set('Authorization', bearer());
    const lineId = detail.body.data.lineas[0].id;
    const applyKey = randomUUID();
    const fechaAplicacion = new Date(Date.now() - 3_600_000).toISOString();
    const applied = await post(`/facturables/${facturableId}/aplicar`, { lineaComprobanteId: lineId, cantidad: '1.000', fechaEfectiva: fechaAplicacion }, applyKey);
    expect(applied.status).toBe(200);
    expect(applied.body.data.pendiente).toBe('0.250');
    expect((await post(`/facturables/${facturableId}/aplicar`, { lineaComprobanteId: lineId, cantidad: '1.000', fechaEfectiva: fechaAplicacion }, applyKey)).body.data.pendiente).toBe('0.250');
    expect((await post(`/facturables/${facturableId}/aplicar`, { lineaComprobanteId: lineId, cantidad: '0.251', fechaEfectiva: fechaAplicacion })).status).toBe(409);

    const antesDeAplicacion = new Date(Date.now() - 4_000_000).toISOString();
    expect((await post(`/comprobantes/${comprobanteId}/anular`, { version: 1, fechaEfectiva: antesDeAplicacion, motivo: 'Fecha anterior a aplicación' })).status).toBe(400);
    const annulled = await post(`/comprobantes/${comprobanteId}/anular`, { version: 1, fechaEfectiva: new Date().toISOString(), motivo: 'Registro duplicado en prueba' });
    expect(annulled.status).toBe(200);
    expect(annulled.body.data).toMatchObject({ version: 2, importeFinal: '125.00', saldo: '0.00', motivoAnulacion: 'Registro duplicado en prueba' });
    const afterAnnulment = await request(app).get(`/api/fuentes-gerenciales/finanzas/facturables/${facturableId}`).set('Authorization', bearer());
    expect(afterAnnulment.body.data.pendiente).toBe('1.250');
    expect(afterAnnulment.body.data.aplicaciones[0].comprobanteAnuladaEn).toBeTruthy();
  });
});
