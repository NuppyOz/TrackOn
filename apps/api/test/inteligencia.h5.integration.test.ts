import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
let contratoId: number;
let sucesorId: number;
let previousCoverage: Awaited<ReturnType<typeof prisma.coberturaGerencial.findUnique>>;
const range = 'desde=2001-02-01T00:00:00Z&hasta=2001-03-01T00:00:00Z';
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;
const post = (path: string, data: object) => request(app).post(`/api/fuentes-gerenciales${path}`).set('Authorization', bearer()).set('Idempotency-Key', randomUUID()).send(data);
beforeAll(async () => {
    fixture = await crearFixtureComercial('H5');
    previousCoverage = await prisma.coberturaGerencial.findUnique({ where: { area: 'COMERCIAL' } });
    conceptoId = (await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio H5', tipo: 'SERVICIO', unidad: 'servicio' } })).id;
    const ids: number[] = [];
    for (let index = 0; index < 2; index++) {
        const quote = await prisma.cotizacionComercial.create({ data: {
            clienteId: fixture.clientes[index]!, creadaPorId: fixture.usuarios[0]!, clienteNombreRegistrado: fixture.prefijo,
            estado: index === 0 ? 'APROBADA' : 'RECHAZADA', subtotal: '100.00', descuento: '0.00', total: '100.00',
            creadaEn: new Date(index === 0 ? '2001-01-15T00:00:00Z' : '2001-02-02T00:00:00Z'),
            enviadaEn: new Date('2001-02-02T01:00:00Z'), decididaEn: new Date('2001-02-03T00:00:00Z'), venceEn: new Date('2001-02-28T00:00:00Z'),
            decisionOrigen: 'INTERNO', decisionUsuarioId: fixture.usuarios[0]!, version: 3,
            lineas: { create: { conceptoId, posicion: 1, descripcion: 'Servicio H5', tipo: 'SERVICIO', unidad: 'servicio', cantidad: '1.000', precio: '100.00', subtotal: '100.00', descuento: '0.00', total: '100.00' } },
        } }); ids.push(quote.id);
    }
    await prisma.ventaComercial.create({ data: { cotizacionId: ids[0]!, clienteId: fixture.clientes[0]!, confirmadaPorId: fixture.usuarios[0]!, total: '100.00', confirmadaEn: new Date('2001-02-04T00:00:00Z') } });
});
afterAll(async () => {
    if (fixture) {
        const coverage = await prisma.coberturaGerencial.findUnique({ where: { area: 'COMERCIAL' } });
        if (previousCoverage) await prisma.coberturaGerencial.update({ where: { id: previousCoverage.id }, data: { desde: previousCoverage.desde, hastaVerificada: previousCoverage.hastaVerificada, responsableId: previousCoverage.responsableId, observacion: previousCoverage.observacion, version: previousCoverage.version } });
        else if (coverage?.responsableId === fixture.usuarios[0]) await prisma.coberturaGerencial.delete({ where: { id: coverage.id } });
        await prisma.contratoGerencial.deleteMany({ where: { clienteId: { in: fixture.clientes } } });
        const ids = (await prisma.cotizacionComercial.findMany({ where: { clienteId: { in: fixture.clientes } }, select: { id: true } })).map(x => x.id);
        await prisma.ventaComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: ids } } });
        await prisma.cotizacionComercial.deleteMany({ where: { id: { in: ids } } });
        await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});
describe('H5 con fuentes y cohortes persistidas', () => {
    it('autoriza y registra cobertura optimista con responsable de la sesión', async () => {
        expect((await request(app).get(`/api/inteligencia/comercial?${range}`)).status).toBe(401);
        expect((await request(app).get(`/api/inteligencia/comercial?${range}`).set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
        const payload = { version: previousCoverage?.version ?? 0, desde: '2001-02-01T00:00:00Z', hastaVerificada: '2001-03-01T00:00:00Z', observacion: 'Cobertura exclusiva de prueba' };
        const response = await request(app).put('/api/fuentes-gerenciales/cobertura/COMERCIAL').set('Authorization', bearer()).send(payload);
        expect(response.status).toBe(200); expect(response.body.data.responsable.id).toBe(fixture.usuarios[0]);
        expect((await request(app).put('/api/fuentes-gerenciales/cobertura/COMERCIAL').set('Authorization', bearer()).send(payload)).status).toBe(409);
        expect(await prisma.auditoria.count({ where: { usuarioId: fixture.usuarios[0], entidad: 'CoberturaGerencial' } })).toBeGreaterThan(0);
    });
    it('renueva un contrato vencido una sola vez y conserva ambos registros', async () => {
        const created = await post('/contratos', { clienteId: fixture.clientes[0], referencia: `${fixture.prefijo}-ORIGEN`, inicio: '2000-12-01T00:00:00Z', fin: '2001-02-15T00:00:00Z', importe: '100.00' });
        expect(created.status).toBe(201); contratoId = created.body.data.id;
        const renewal = await post(`/contratos/${contratoId}/renovar`, { version: 1, referencia: `${fixture.prefijo}-RENOVADO`, inicio: '2001-02-15T00:00:00Z', fin: '2001-06-01T00:00:00Z', importe: '150.00' });
        expect(renewal.status).toBe(201); sucesorId = renewal.body.data.id;
        expect(renewal.body.data).toMatchObject({ anteriorId: contratoId, importe: '150.00', clienteId: fixture.clientes[0] });
        expect((await post(`/contratos/${contratoId}/renovar`, { version: 2, referencia: `${fixture.prefijo}-DUP`, inicio: '2001-02-15T00:00:00Z', fin: '2001-06-01T00:00:00Z', importe: '100.00' })).status).toBe(409);
    });
    it('distingue creadas de cohorte enviada y calcula ticket y renovaciones', async () => {
        const result = await request(app).get(`/api/inteligencia/comercial?${range}`).set('Authorization', bearer());
        expect(result.status).toBe(200); expect(result.body.data.cobertura.estado).toBe('COMPLETA');
        const metrics = Object.fromEntries(result.body.data.metricas.map((m: {clave:string;valor:unknown}) => [m.clave, m.valor]));
        expect(metrics).toMatchObject({ cotizaciones_total: 1, conversion_porcentaje: '50.00', ventas_cantidad: 1, ventas_importe: '100.00', clientes_con_ventas: 1, ticket_promedio: '100.00', contratos_activos: 1, renovaciones_cantidad: 1, renovacion_porcentaje: '100.00' });
        expect(result.body.data.metricas.find((m: {clave:string}) => m.clave === 'conversion_porcentaje').base).toEqual({ numerador: 1, denominador: 2 });
    });
    it('terminar conserva el contrato activo en cortes anteriores y sin base no inventa porcentaje', async () => {
        expect((await post(`/contratos/${sucesorId}/terminar`, { version: 1, terminadoEn: '2001-02-20T00:00:00Z', motivo: 'Fin documentado de prueba' })).status).toBe(200);
        const prior = await request(app).get('/api/inteligencia/comercial?desde=2001-02-01T00:00:00Z&hasta=2001-02-18T00:00:00Z').set('Authorization', bearer());
        expect(prior.body.data.metricas.find((m: {clave:string}) => m.clave === 'contratos_activos').valor).toBe(1);
        const empty = await request(app).get('/api/inteligencia/comercial?desde=1990-01-01T00:00:00Z&hasta=1990-02-01T00:00:00Z').set('Authorization', bearer());
        expect(empty.status).toBe(200); expect(empty.body.data.metricas.find((m: {clave:string}) => m.clave === 'conversion_porcentaje')).toMatchObject({ valor: null, estado: 'SIN_BASE_DE_CALCULO' });
    });
});
