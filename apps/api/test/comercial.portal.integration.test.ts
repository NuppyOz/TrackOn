import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';
let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
let conceptoId: number;
const quotes: number[] = [];
let cookie = '';
let cuentaId: number;
let version = 1;
const password = 'TrackOn-portal-test-2026';
const origin = process.env.PORTAL_ALLOWED_ORIGIN ?? 'http://localhost:5173';
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;
const cuentaPath = () => `/api/comercial/clientes/${fixture.clientes[0]}/cuenta-portal`;
const portalPost = (path: string, data: object) => request(app).post(`/api/portal${path}`).set('Origin', origin).set('Cookie', cookie).set('Idempotency-Key', randomUUID()).send(data);
beforeAll(async () => {
    fixture = await crearFixtureComercial('PORTAL');
    conceptoId = (await prisma.conceptoComercial.create({ data: { codigo: fixture.prefijo, nombre: 'Servicio visible', tipo: 'SERVICIO', unidad: 'servicio' } })).id;
    await prisma.tarifaComercial.create({ data: { conceptoId, precio: '25.00' } });
    for (const index of [0, 1, 0]) {
        const created = await request(app).post('/api/comercial/cotizaciones').set('Authorization', bearer()).set('Idempotency-Key', randomUUID())
            .send({ clienteId: fixture.clientes[index], venceEn: new Date(Date.now() + 86_400_000).toISOString(), nota: 'NOTA PRIVADA NO PORTAL', lineas: [{ conceptoId, cantidad: '1.000', descuento: '0.00' }] });
        expect(created.status).toBe(201); quotes.push(created.body.data.id);
    }
    for (const id of quotes.slice(0, 2)) {
        expect((await request(app).post(`/api/comercial/cotizaciones/${id}/enviar`).set('Authorization', bearer()).set('Idempotency-Key', randomUUID()).send({ version: 1 })).status).toBe(200);
    }
});
afterAll(async () => {
    if (fixture) {
        const cuentas = (await prisma.cuentaPortal.findMany({ where: { clienteId: { in: fixture.clientes } }, select: { id: true } })).map(x => x.id);
        await prisma.operacionIdempotente.deleteMany({ where: { tipoActor: 'PORTAL', actorId: { in: cuentas } } });
        await prisma.sesionPortal.deleteMany({ where: { cuentaId: { in: cuentas } } });
        await prisma.notaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: quotes } } });
        await prisma.lineaCotizacionComercial.deleteMany({ where: { cotizacionId: { in: quotes } } });
        await prisma.cotizacionComercial.deleteMany({ where: { id: { in: quotes } } });
        await prisma.cuentaPortal.deleteMany({ where: { id: { in: cuentas } } });
        await prisma.tarifaComercial.deleteMany({ where: { conceptoId } });
        await prisma.conceptoComercial.deleteMany({ where: { id: conceptoId } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});
describe('Portal aislado con sesiones opacas reales', () => {
    it('solo ADMIN administra y recupera una cuenta sin secretos', async () => {
        expect((await request(app).get(cuentaPath()).set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
        expect((await request(app).get(cuentaPath()).set('Authorization', bearer())).body.data).toBeNull();
        const created = await request(app).post(cuentaPath()).set('Authorization', bearer()).send({ identificador: `${fixture.prefijo}-cliente`.toLowerCase(), password });
        expect(created.status).toBe(201); cuentaId = created.body.data.id; version = created.body.data.version;
        expect(JSON.stringify(created.body)).not.toMatch(/password|hash|token/i);
        const fetched = await request(app).get(cuentaPath()).set('Authorization', bearer());
        expect(fetched.status).toBe(200); expect(fetched.body.data.id).toBe(cuentaId);
    });
    it('no acepta identidad de empleado y bloquea origen ajeno', async () => {
        expect((await request(app).get('/api/portal/me').set('Authorization', bearer())).status).toBe(401);
        expect((await request(app).post('/api/portal/login').set('Origin', 'https://ajeno.invalid').send({ identificador: `${fixture.prefijo}-cliente`.toLowerCase(), password })).status).toBe(403);
        const login = await portalPost('/login', { identificador: `${fixture.prefijo}-cliente`.toLowerCase(), password });
        expect(login.status).toBe(200);
        const cookies = login.headers['set-cookie'] as unknown as string[];
        expect(cookies[0]).toMatch(/HttpOnly/i); expect(cookies[0]).toMatch(/SameSite=Strict/i); expect(cookies[0]).toMatch(/Path=\/api\/portal/i);
        cookie = cookies[0]!.split(';')[0]!;
        expect(JSON.stringify(login.body)).not.toMatch(/password|hash|accessToken|refreshToken/);
        const sesion = await prisma.sesionPortal.findFirstOrThrow({ where: { cuentaId } });
        expect(sesion.tokenHash).toMatch(/^[a-f0-9]{64}$/); expect(cookie).not.toContain(sesion.tokenHash);
        expect((await request(app).get('/api/comercial/cotizaciones').set('Cookie', cookie)).status).toBe(401);
        expect((await request(app).get('/api/portal/me').set('Cookie', cookie)).status).toBe(200);
    });
    it('solo lista y decide sus cotizaciones enviadas sin notas internas', async () => {
        const list = await request(app).get('/api/portal/cotizaciones').set('Cookie', cookie);
        expect(list.status).toBe(200); expect(list.body.data.items.map((x: {id:number}) => x.id)).toEqual([quotes[0]]);
        expect((await request(app).get(`/api/portal/cotizaciones/${quotes[1]}`).set('Cookie', cookie)).status).toBe(404);
        expect((await request(app).get(`/api/portal/cotizaciones/${quotes[2]}`).set('Cookie', cookie)).status).toBe(404);
        const detail = await request(app).get(`/api/portal/cotizaciones/${quotes[0]}`).set('Cookie', cookie);
        expect(detail.status).toBe(200); expect(JSON.stringify(detail.body)).not.toContain('NOTA PRIVADA');
        expect(detail.body.data.notas).toBeUndefined(); expect(detail.body.data.creadaPorId).toBeUndefined();
        const key = randomUUID(); const body = { version: 2, decision: 'APROBADA', comentario: 'Cliente conforme' };
        const send = () => request(app).post(`/api/portal/cotizaciones/${quotes[0]}/decision`).set('Origin', origin).set('Cookie', cookie).set('Idempotency-Key', key).send(body);
        const decided = await send(); expect(decided.status).toBe(200); expect((await send()).body.data).toEqual(decided.body.data);
        const quote = await prisma.cotizacionComercial.findUniqueOrThrow({ where: { id: quotes[0]! } });
        expect(quote.decisionOrigen).toBe('PORTAL'); expect(quote.decisionCuentaId).toBe(cuentaId); expect(quote.decisionUsuarioId).toBeNull();
    });
    it('restablecer y desactivar revocan todas las sesiones de la cuenta', async () => {
        const reset = await request(app).post(`${cuentaPath()}/restablecer`).set('Authorization', bearer()).send({ version, password: 'TrackOn-portal-nueva-2026' });
        expect(reset.status).toBe(200); version = reset.body.data.version;
        expect((await request(app).get('/api/portal/me').set('Cookie', cookie)).status).toBe(401);
        const nuevoLogin = await portalPost('/login', { identificador: `${fixture.prefijo}-cliente`.toLowerCase(), password: 'TrackOn-portal-nueva-2026' });
        expect(nuevoLogin.status).toBe(200); cookie = (nuevoLogin.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
        const off = await request(app).patch(cuentaPath()).set('Authorization', bearer()).send({ version, activo: false });
        expect(off.status).toBe(200);
        expect((await request(app).get('/api/portal/me').set('Cookie', cookie)).status).toBe(401);
        expect((await portalPost('/logout', {})).status).toBe(204);
    });
});
