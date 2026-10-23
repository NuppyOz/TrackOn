import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

const prefix = `CRM-${randomUUID().slice(0, 8)}`;
const password = 'TrackOn-CRM-test-password';
const usuarios: number[] = [];
const empleados: number[] = [];
const personas: number[] = [];
const clientes: number[] = [];
let admin = '';
let tecnico = '';

beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    for (const cod of ['ADMIN', 'TEC']) {
        const rol = await prisma.rol.upsert({ where: { cod }, create: { cod, nombre: cod }, update: {} });
        const usuario = await prisma.usuario.create({ data: {
            identificador: `${prefix}-${cod}`.toLowerCase(), passwordHash, rol: { connect: { id: rol.id } },
            empleado: { create: { codEmpleado: `${prefix}-${cod}`, habilitadoComoTecnico: true,
                persona: { create: { firstName: 'Comercial', firstLastName: 'Prueba' } } } },
        }, include: { empleado: true } });
        usuarios.push(usuario.id); empleados.push(usuario.empleadoId); personas.push(usuario.empleado.personaId);
        const result = await request(app).post('/api/auth/login').send({ identificador: usuario.identificador, password });
        expect(result.status).toBe(200);
        if (cod === 'ADMIN') admin = result.body.data.accessToken;
        else tecnico = result.body.data.accessToken;
    }
    for (let indice = 0; indice < 2; indice++) {
        const cliente = await prisma.cliente.create({ data: { codigo: `${prefix}-${indice}`,
            persona: { create: { firstName: 'Cliente', firstLastName: `${indice}` } } } });
        clientes.push(cliente.id); personas.push(cliente.personaId!);
    }
});

afterAll(async () => {
    await prisma.referenciaDocumentoComercial.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.notaComercial.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.contactoComercial.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.perfilComercialCliente.deleteMany({ where: { clienteId: { in: clientes } } });
    await prisma.cliente.deleteMany({ where: { id: { in: clientes } } });
    await prisma.sesion.deleteMany({ where: { usuarioId: { in: usuarios } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarios } } });
    await prisma.empleado.deleteMany({ where: { id: { in: empleados } } });
    await prisma.persona.deleteMany({ where: { id: { in: personas } } });
    await prisma.$disconnect();
});

const url = (cliente = clientes[0]) => `/api/comercial/clientes/${cliente}`;
const bearer = () => `Bearer ${admin}`;

describe('CRM comercial aditivo con PostgreSQL', () => {
    it('protege acceso interno y no concede gestión comercial al técnico', async () => {
        expect((await request(app).get(`${url()}/perfil`)).status).toBe(401);
        expect((await request(app).get(`${url()}/perfil`).set('Authorization', `Bearer ${tecnico}`)).status).toBe(403);
    });

    it('persiste el perfil y detecta una actualización concurrente', async () => {
        const inicial = await request(app).get(`${url()}/perfil`).set('Authorization', bearer());
        expect(inicial.status).toBe(200); expect(inicial.body.data.version).toBe(0);
        const crear = await request(app).put(`${url()}/perfil`).set('Authorization', bearer())
            .send({ version: 0, clasificacion: 'Empresa recurrente', instruccionesFacturacion: 'Referencia de compra requerida' });
        expect(crear.status).toBe(200); expect(crear.body.data.version).toBe(1);
        const consulta = await request(app).get(`${url()}/perfil`).set('Authorization', bearer());
        expect(consulta.body.data.clasificacion).toBe('Empresa recurrente');
        expect((await request(app).put(`${url()}/perfil`).set('Authorization', bearer())
            .send({ version: 0, clasificacion: 'Cambio atrasado' })).status).toBe(409);
    });

    it('mantiene los contactos dentro del cliente y valida la versión', async () => {
        const creado = await request(app).post(`${url()}/contactos`).set('Authorization', bearer())
            .send({ nombre: 'Contacto CRM', email: 'crm@example.com' });
        expect(creado.status).toBe(201);
        const id = creado.body.data.id;
        expect((await request(app).patch(`${url(clientes[1])}/contactos/${id}`).set('Authorization', bearer())
            .send({ version: 1, activo: false })).status).toBe(404);
        const updated = await request(app).patch(`${url()}/contactos/${id}`).set('Authorization', bearer())
            .send({ version: 1, activo: false });
        expect(updated.status).toBe(200); expect(updated.body.data.activo).toBe(false);
        expect((await request(app).patch(`${url()}/contactos/${id}`).set('Authorization', bearer())
            .send({ version: 1, nombre: 'Cambio atrasado' })).status).toBe(409);
        const listado = await request(app).get(`${url()}/contactos?q=sin-coincidencias&pagina=1&limite=25`).set('Authorization', bearer());
        expect(listado.status).toBe(200); expect(listado.body.data.items).toEqual([]);
    });

    it('registra el autor desde sesión y rechaza referencias inseguras', async () => {
        const nota = await request(app).post(`${url()}/notas`).set('Authorization', bearer()).send({ texto: 'Llamar antes de visitar.' });
        expect(nota.status).toBe(201); expect(nota.body.data.autorId).toBe(usuarios[0]);
        const falsa = await request(app).post(`${url()}/notas`).set('Authorization', bearer()).send({ texto: 'Otra', autorId: usuarios[1] });
        expect(falsa.status).toBe(400);
        expect((await request(app).post(`${url()}/documentos`).set('Authorization', bearer())
            .send({ titulo: 'Referencia', tipo: 'COMERCIAL', url: 'javascript:alert(1)' })).status).toBe(400);
        const doc = await request(app).post(`${url()}/documentos`).set('Authorization', bearer())
            .send({ titulo: 'Referencia externa', tipo: 'COMERCIAL', url: 'https://example.com/referencia' });
        expect(doc.status).toBe(201);
        const list = await request(app).get(`${url()}/documentos`).set('Authorization', bearer());
        expect(list.body.data.items.some((item: { id: number }) => item.id === doc.body.data.id)).toBe(true);
        const metadata = await request(app).post(`${url()}/documentos`).set('Authorization', bearer())
            .send({ titulo: 'Solo metadatos', tipo: 'COMERCIAL', url: null, nota: null });
        expect(metadata.status).toBe(201); expect(metadata.body.data.url).toBeNull();
    });
});
