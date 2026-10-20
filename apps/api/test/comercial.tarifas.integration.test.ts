import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
const conceptos: number[] = [];
let tarifaCliente: { id: number; version: number };
const bearer = () => `Bearer ${fixture.tokens.ADMIN}`;

beforeAll(async () => { fixture = await crearFixtureComercial('TARIFAS'); });
afterAll(async () => {
    if (fixture) {
        await prisma.tarifaComercial.deleteMany({ where: { conceptoId: { in: conceptos } } });
        await prisma.conceptoComercial.deleteMany({ where: { id: { in: conceptos } } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});

describe('Tarifas persistidas y resolución de precios', () => {
    it('exige gestión comercial y valida precios', async () => {
        expect((await request(app).get('/api/comercial/conceptos')).status).toBe(401);
        expect((await request(app).get('/api/comercial/conceptos').set('Authorization', `Bearer ${fixture.tokens.TEC}`)).status).toBe(403);
        const concepto = await request(app).post('/api/comercial/conceptos').set('Authorization', bearer())
            .send({ codigo: `${fixture.prefijo}-SERV`, tipo: 'SERVICIO', nombre: 'Servicio tarifado', unidad: 'servicio' });
        expect(concepto.status).toBe(201); conceptos.push(concepto.body.data.id);
        expect((await request(app).post('/api/comercial/tarifas').set('Authorization', bearer())
            .send({ conceptoId: conceptos[0], precio: '-1.00' })).status).toBe(400);
    });

    it('resuelve precio del cliente antes del estándar y no supone cero', async () => {
        const estandar = await request(app).post('/api/comercial/tarifas').set('Authorization', bearer())
            .send({ conceptoId: conceptos[0], precio: '100' });
        expect(estandar.status).toBe(201); expect(estandar.body.data.precio).toBe('100.00');
        const especial = await request(app).post('/api/comercial/tarifas').set('Authorization', bearer())
            .send({ conceptoId: conceptos[0], clienteId: fixture.clientes[0], precio: '80.00' });
        expect(especial.status).toBe(201); tarifaCliente = especial.body.data;
        const resolver = (clienteId: number) => request(app).get(`/api/comercial/tarifas/resolver?clienteId=${clienteId}&conceptoId=${conceptos[0]}`).set('Authorization', bearer());
        const propia = await resolver(fixture.clientes[0]);
        expect(propia.status).toBe(200); expect(propia.body.data).toMatchObject({ origen: 'CLIENTE', precio: '80.00' });
        expect((await resolver(fixture.clientes[1])).body.data).toMatchObject({ origen: 'ESTANDAR', precio: '100.00' });
    });

    it('preserva tarifas anteriores y protege versiones y reactivaciones', async () => {
        const off = await request(app).patch(`/api/comercial/tarifas/${tarifaCliente.id}/estado`).set('Authorization', bearer())
            .send({ version: tarifaCliente.version, activo: false });
        expect(off.status).toBe(200);
        expect((await request(app).patch(`/api/comercial/tarifas/${tarifaCliente.id}/estado`).set('Authorization', bearer())
            .send({ version: tarifaCliente.version, activo: true })).status).toBe(409);
        const reemplazo = await request(app).post('/api/comercial/tarifas').set('Authorization', bearer())
            .send({ conceptoId: conceptos[0], clienteId: fixture.clientes[0], precio: '75.00' });
        expect(reemplazo.status).toBe(201);
        expect((await request(app).patch(`/api/comercial/tarifas/${tarifaCliente.id}/estado`).set('Authorization', bearer())
            .send({ version: off.body.data.version, activo: true })).status).toBe(409);
        const anterior = await prisma.tarifaComercial.findUniqueOrThrow({ where: { id: tarifaCliente.id } });
        expect(anterior.precio.toFixed(2)).toBe('80.00'); expect(anterior.activo).toBe(false);
    });

    it('la restricción persistente impide dos tarifas estándar activas concurrentes', async () => {
        const creado = await request(app).post('/api/comercial/conceptos').set('Authorization', bearer())
            .send({ codigo: `${fixture.prefijo}-RACE`, tipo: 'INSUMO', nombre: 'Insumo', unidad: 'unidad' });
        expect(creado.status).toBe(201); conceptos.push(creado.body.data.id);
        const respuestas = await Promise.all(['10.00', '20.00'].map(precio => request(app)
            .post('/api/comercial/tarifas').set('Authorization', bearer()).send({ conceptoId: conceptos[1], precio })));
        expect(respuestas.map(res => res.status).sort()).toEqual([201, 409]);
        expect(await prisma.tarifaComercial.count({ where: { conceptoId: conceptos[1], activo: true } })).toBe(1);
    });
});
