import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/infrastructure/prisma.js';
import { hashPassword } from '../../src/security/password.js';

/** Solo datos propios de PostgreSQL de pruebas; nunca usa credenciales reales. */
export async function crearFixtureComercial(area: string) {
    const prefijo = `${area}-${randomUUID().slice(0, 8)}`;
    const password = 'TrackOn-fixture-local-2026';
    const passwordHash = await hashPassword(password);
    const usuarios: number[] = [], empleados: number[] = [], personas: number[] = [], clientes: number[] = [];
    const tokens: Record<string, string> = {};
    for (const cod of ['ADMIN', 'TEC']) {
        const rol = await prisma.rol.upsert({ where: { cod }, create: { cod, nombre: cod }, update: {} });
        const usuario = await prisma.usuario.create({ data: {
            identificador: `${prefijo}-${cod}`.toLowerCase(), passwordHash,
            rol: { connect: { id: rol.id } },
            empleado: { create: { codEmpleado: `${prefijo}-${cod}`, habilitadoComoTecnico: true,
                persona: { create: { firstName: 'Prueba', firstLastName: area } } } },
        }, include: { empleado: true } });
        usuarios.push(usuario.id); empleados.push(usuario.empleadoId); personas.push(usuario.empleado.personaId);
        const login = await request(app).post('/api/auth/login').send({ identificador: usuario.identificador, password });
        if (login.status !== 200) throw new Error(`No se pudo iniciar sesión de prueba: ${login.status}`);
        tokens[cod] = login.body.data.accessToken;
    }
    for (let i = 0; i < 2; i++) {
        const cliente = await prisma.cliente.create({ data: { codigo: `${prefijo}-${i}`,
            persona: { create: { firstName: 'Cliente', firstLastName: `${area}-${i}` } } } });
        clientes.push(cliente.id); personas.push(cliente.personaId!);
    }
    return { prefijo, tokens, clientes, usuarios, empleados, personas };
}

export async function limpiarFixtureComercial(fixture: Awaited<ReturnType<typeof crearFixtureComercial>>) {
    await prisma.auditoria.deleteMany({ where: { usuarioId: { in: fixture.usuarios } } });
    await prisma.operacionIdempotente.deleteMany({ where: { tipoActor: 'USUARIO', actorId: { in: fixture.usuarios } } });
    await prisma.cliente.deleteMany({ where: { id: { in: fixture.clientes } } });
    await prisma.sesion.deleteMany({ where: { usuarioId: { in: fixture.usuarios } } });
    await prisma.usuario.deleteMany({ where: { id: { in: fixture.usuarios } } });
    await prisma.empleado.deleteMany({ where: { id: { in: fixture.empleados } } });
    await prisma.persona.deleteMany({ where: { id: { in: fixture.personas } } });
}
