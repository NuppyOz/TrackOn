import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/prisma.js';
import { ejecutarIdempotente } from '../src/infrastructure/idempotencia.js';
import { AppError } from '../src/errors/AppError.js';
import { crearFixtureComercial, limpiarFixtureComercial } from './support/comercial-fixtures.js';

let fixture: Awaited<ReturnType<typeof crearFixtureComercial>>;
beforeAll(async () => { fixture = await crearFixtureComercial('IDEMP'); });
afterAll(async () => {
    if (fixture) {
        await prisma.notaComercial.deleteMany({ where: { clienteId: { in: fixture.clientes } } });
        await limpiarFixtureComercial(fixture);
    }
    await prisma.$disconnect();
});

describe('Idempotencia transaccional persistente', () => {
    it('dos solicitudes concurrentes con la misma intención escriben un solo hecho', async () => {
        const clave = randomUUID();
        const actor = { tipo: 'USUARIO' as const, id: fixture.usuarios[0] };
        const payload = { clienteId: fixture.clientes[0], texto: 'Una sola nota de prueba' };
        const escribir = () => ejecutarIdempotente(actor, 'PRUEBA_CREAR_NOTA', clave, payload, async tx => {
            const nota = await tx.notaComercial.create({ data: { clienteId: payload.clienteId, autorId: actor.id, texto: payload.texto } });
            return { id: nota.id, creadaEn: nota.creadaEn.toISOString() };
        });
        const [a, b] = await Promise.all([escribir(), escribir()]);
        expect(a).toEqual(b);
        expect(await prisma.notaComercial.count({ where: { clienteId: payload.clienteId, texto: payload.texto } })).toBe(1);
        const cache = await ejecutarIdempotente(actor, 'PRUEBA_CREAR_NOTA', clave,
            { texto: payload.texto, clienteId: payload.clienteId }, async () => { throw new Error('No debe volver a ejecutarse'); });
        expect(cache).toEqual(a);
        await expect(ejecutarIdempotente(actor, 'PRUEBA_CREAR_NOTA', clave, { ...payload, texto: 'Otra intención' }, async () => null))
            .rejects.toMatchObject({ statusCode: 409 });
    });

    it('un fallo revierte tanto el negocio como la reserva de la clave', async () => {
        const clave = randomUUID();
        const actor = { tipo: 'USUARIO' as const, id: fixture.usuarios[0] };
        const texto = 'Esta escritura debe revertirse';
        await expect(ejecutarIdempotente(actor, 'PRUEBA_REVERSION', clave, { texto }, async tx => {
            await tx.notaComercial.create({ data: { clienteId: fixture.clientes[0], autorId: actor.id, texto } });
            throw new AppError(409, 'Fallo de prueba');
        })).rejects.toMatchObject({ statusCode: 409 });
        expect(await prisma.notaComercial.count({ where: { clienteId: fixture.clientes[0], texto } })).toBe(0);
        expect(await prisma.operacionIdempotente.count({ where: { clave } })).toBe(0);
        const resultado = await ejecutarIdempotente(actor, 'PRUEBA_REVERSION', clave, { texto }, async () => ({ recuperada: true }));
        expect(resultado).toEqual({ recuperada: true });
    });
});
