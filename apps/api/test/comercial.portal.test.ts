import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

const suffix = randomUUID().slice(0, 8);
const password = 'Portal-TrackOn-test-2026';
const identificador = `portal-${suffix}`;
let adminToken = '';
let userId = 0;
let employeeId = 0;
const personIds: number[] = [];
let clientId = 0;
const origin = 'http://127.0.0.1:5179';

beforeAll(async () => {
  process.env.PORTAL_ALLOWED_ORIGIN = origin;
  const rol = await prisma.rol.upsert({ where: { cod: 'ADMIN' }, create: { cod: 'ADMIN', nombre: 'Administrador' }, update: {} });
  const user = await prisma.usuario.create({ data: {
    identificador: `portal-test-admin-${suffix}`, passwordHash: await hashPassword(password), rol: { connect: { id: rol.id } },
    empleado: { create: { codEmpleado: `PTA-${suffix}`, persona: { create: { firstName: 'Portal', firstLastName: 'Admin' } } } },
  }, include: { empleado: { include: { persona: true } } } });
  userId = user.id; employeeId = user.empleadoId; personIds.push(user.empleado.personaId);
  const login = await request(app).post('/api/auth/login').send({ identificador: user.identificador, password });
  expect(login.status).toBe(200);
  adminToken = login.body.data.accessToken as string;
  const client = await prisma.cliente.create({ data: { codigo: `PORTAL-${suffix}`, persona: { create: { firstName: 'Cliente', firstLastName: suffix } } } });
  clientId = client.id;
  personIds.push(client.personaId!);
});

afterAll(async () => {
  await prisma.sesionPortal.deleteMany({ where: { cuenta: { clienteId: clientId } } });
  await prisma.cuentaPortal.deleteMany({ where: { clienteId: clientId } });
  await prisma.cliente.deleteMany({ where: { id: clientId } });
  await prisma.sesion.deleteMany({ where: { usuarioId: userId } });
  await prisma.usuario.deleteMany({ where: { id: userId } });
  await prisma.empleado.deleteMany({ where: { id: employeeId } });
  await prisma.persona.deleteMany({ where: { id: { in: personIds } } });
  await prisma.$disconnect();
});

const accountUrl = () => `/api/comercial/clientes/${clientId}/cuenta-portal`;
const admin = () => `Bearer ${adminToken}`;
const portalPost = (path: string) => request(app).post(path).set('Origin', origin);

describe('portal comercial', () => {
  it('crea cuenta admin sin exponer secretos y mantiene el portal separado del JWT interno', async () => {
    const unauthorized = await request(app).post(accountUrl()).send({ identificador, password });
    expect(unauthorized.status).toBe(401);
    const created = await request(app).post(accountUrl()).set('Authorization', admin()).send({ identificador, password });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ clienteId: clientId, identificador, activo: true, version: 1 });
    expect(created.body.data).not.toHaveProperty('passwordHash');
    expect(created.body.data).not.toHaveProperty('password');
    const login = await portalPost('/api/portal/login').send({ identificador, password }).then(response => response);
    expect(login.status).toBe(200);
    expect(login.body.data).toEqual({ cuenta: { id: created.body.data.id, identificador }, cliente: { id: clientId, nombre: `Cliente ${suffix}` } });
    expect(JSON.stringify(login.body)).not.toContain(password);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect(login.headers['set-cookie'][0]).toContain('Path=/api/portal');
    const employeeOnly = await request(app).get('/api/portal/me').set('Authorization', admin());
    expect(employeeOnly.status).toBe(401);
    const me = await request(app).get('/api/portal/me').set('Cookie', login.headers['set-cookie'][0].split(';')[0]).set('Authorization', admin());
    expect(me.status).toBe(200);
    expect(me.body.data.cuenta).toEqual(login.body.data.cuenta);
    expect(me.body.data.cliente).toEqual(login.body.data.cliente);
  });

  it('bloquea origen cruzado y devuelve 404 para cotizaciones no visibles', async () => {
    const login = await portalPost('/api/portal/login').send({ identificador, password });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    expect((await request(app).post('/api/portal/logout').set('Origin', 'https://bad.example').set('Cookie', cookie)).status).toBe(403);
    expect((await request(app).get('/api/portal/cotizaciones/2147483647').set('Cookie', cookie)).status).toBe(404);
    const loggedOut = await portalPost('/api/portal/logout').set('Cookie', cookie);
    expect(loggedOut.status).toBe(204);
    expect(loggedOut.headers['set-cookie'][0]).toContain('Max-Age=0');
    expect((await request(app).get('/api/portal/me').set('Cookie', cookie)).status).toBe(401);
    expect((await portalPost('/api/portal/logout')).status).toBe(204);
  });

  it('revoca las sesiones al restablecer contraseña y reporta intentos limitados', async () => {
    const login = await portalPost('/api/portal/login').send({ identificador, password });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const reset = await request(app).post(`${accountUrl()}/restablecer`).set('Authorization', admin()).send({ version: 1, password: `${password}-new` });
    expect(reset.status).toBe(200);
    expect(reset.body.data.version).toBe(2);
    expect((await request(app).get('/api/portal/me').set('Cookie', cookie)).status).toBe(401);
    expect((await portalPost('/api/portal/login').send({ identificador, password })).status).toBe(401);
    expect((await portalPost('/api/portal/login').send({ identificador, password: `${password}-new` })).status).toBe(200);
    const failedIdentifier = `missing-${suffix}`;
    for (let count = 0; count < 5; count++) {
      expect((await portalPost('/api/portal/login').send({ identificador: failedIdentifier, password })).status).toBe(401);
    }
    expect((await portalPost('/api/portal/login').send({ identificador: failedIdentifier, password })).status).toBe(429);
  });
});
