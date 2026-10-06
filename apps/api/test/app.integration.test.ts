import request from 'supertest';

import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../src/app.js';
import { prisma } from '../src/infrastructure/prisma.js';
import { hashPassword } from '../src/security/password.js';

type RoleCode =
    | 'ADMIN'
    | 'GTE_OPE'
    | 'TEC';

const PASSWORD = 'TrackOnTest123!';

const cuentas = {
    ADMIN: {
        identificador: 'admin.test',
        codEmpleado: 'TEST-ADMIN',
    },

    GTE_OPE: {
        identificador: 'gerente.test',
        codEmpleado: 'TEST-GTE',
    },

    TEC: {
        identificador: 'tecnico.test',
        codEmpleado: 'TEST-TEC',
    },
} satisfies Record<
    RoleCode,
    {
        identificador: string;
        codEmpleado: string;
    }
>;

const tokens: Partial<Record<RoleCode, string>> = {};

async function prepararUsuario(
    rolCod: RoleCode,
) {
    const cuenta = cuentas[rolCod];

    const rol = await prisma.rol.upsert({
        where: {
            cod: rolCod,
        },

        update: {},

        create: {
            cod: rolCod,

            nombre:
                rolCod === 'ADMIN'
                    ? 'Administrador'
                    : rolCod === 'GTE_OPE'
                      ? 'Gerente Operativo'
                      : 'Técnico',
        },
    });

    const empleado = await prisma.empleado.upsert({
        where: {
            codEmpleado: cuenta.codEmpleado,
        },

        update: {
            active: true,

            habilitadoComoTecnico:
                rolCod === 'TEC',
        },

        create: {
            codEmpleado: cuenta.codEmpleado,

            active: true,

            habilitadoComoTecnico:
                rolCod === 'TEC',

            persona: {
                create: {
                    firstName: 'Usuario',
                    firstLastName: rolCod,
                },
            },
        },
    });

    const passwordHash =
        await hashPassword(PASSWORD);

    await prisma.usuario.upsert({
        where: {
            identificador:
                cuenta.identificador,
        },

        update: {
            empleadoId: empleado.id,
            rolId: rol.id,
            activo: true,
            passwordHash,
        },

        create: {
            empleadoId: empleado.id,
            rolId: rol.id,
            identificador:
                cuenta.identificador,
            passwordHash,
            activo: true,
        },
    });
}

async function iniciarSesion(
    rol: RoleCode,
) {
    const respuesta = await request(app)
        .post('/api/auth/login')
        .send({
            identificador:
                cuentas[rol].identificador,

            password: PASSWORD,
        });

    expect(respuesta.status).toBe(200);

    expect(
        respuesta.body.data.accessToken,
    ).toBeTruthy();

    tokens[rol] =
        respuesta.body.data.accessToken;
}

function token(rol: RoleCode) {
    const valor = tokens[rol];

    if (!valor) {
        throw new Error(
            `No existe token para ${rol}`,
        );
    }

    return valor;
}

beforeAll(async () => {
    await prepararUsuario('ADMIN');
    await prepararUsuario('GTE_OPE');
    await prepararUsuario('TEC');

    await iniciarSesion('ADMIN');
    await iniciarSesion('GTE_OPE');
    await iniciarSesion('TEC');
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe('Estado de la API', () => {
    it('GET /api/health responde 200', async () => {
        const respuesta =
            await request(app)
                .get('/api/health');

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.status)
            .toBe('ok');
    });

    it('GET /api/ready responde 200', async () => {
        const respuesta =
            await request(app)
                .get('/api/ready');

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.database)
            .toBe('connected');
    });
});

describe('Autenticación obligatoria', () => {
    const endpoints = [
        '/api/equipos',
        '/api/servicios',
        '/api/cuadrillas',
        '/api/notificaciones',
    ];

    for (const endpoint of endpoints) {
        it(`${endpoint} responde 401 sin token`, async () => {
            const respuesta =
                await request(app)
                    .get(endpoint);

            expect(respuesta.status)
                .toBe(401);
        });
    }
});

describe('Rol TEC', () => {
    it('puede consultar equipos', async () => {
        const respuesta =
            await request(app)
                .get('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('TEC')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('puede consultar servicios', async () => {
        const respuesta =
            await request(app)
                .get('/api/servicios')
                .set(
                    'Authorization',
                    `Bearer ${token('TEC')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('no puede administrar cuadrillas', async () => {
        const respuesta =
            await request(app)
                .get('/api/cuadrillas')
                .set(
                    'Authorization',
                    `Bearer ${token('TEC')}`,
                );

        expect(respuesta.status).toBe(403);
    });

    it('no puede crear equipos', async () => {
        const respuesta =
            await request(app)
                .post('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('TEC')}`,
                )
                .send({});

        expect(respuesta.status).toBe(403);
    });

    it('no puede crear servicios', async () => {
        const respuesta =
            await request(app)
                .post('/api/servicios')
                .set(
                    'Authorization',
                    `Bearer ${token('TEC')}`,
                )
                .send({});

        expect(respuesta.status).toBe(403);
    });
});

describe('Rol GTE_OPE', () => {
    it('puede consultar equipos', async () => {
        const respuesta =
            await request(app)
                .get('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('GTE_OPE')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('puede administrar cuadrillas', async () => {
        const respuesta =
            await request(app)
                .get('/api/cuadrillas')
                .set(
                    'Authorization',
                    `Bearer ${token('GTE_OPE')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('supera RBAC al crear equipos', async () => {
        const respuesta =
            await request(app)
                .post('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('GTE_OPE')}`,
                )
                .send({});

        expect(respuesta.status).toBe(400);
    });
});

describe('Rol ADMIN', () => {
    it('puede consultar equipos', async () => {
        const respuesta =
            await request(app)
                .get('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('ADMIN')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('puede administrar cuadrillas', async () => {
        const respuesta =
            await request(app)
                .get('/api/cuadrillas')
                .set(
                    'Authorization',
                    `Bearer ${token('ADMIN')}`,
                );

        expect(respuesta.status).toBe(200);
    });

    it('supera RBAC al crear equipos', async () => {
        const respuesta =
            await request(app)
                .post('/api/equipos')
                .set(
                    'Authorization',
                    `Bearer ${token('ADMIN')}`,
                )
                .send({});

        expect(respuesta.status).toBe(400);
    });

    it('GET /api/auth/me identifica al administrador', async () => {
        const respuesta =
            await request(app)
                .get('/api/auth/me')
                .set(
                    'Authorization',
                    `Bearer ${token('ADMIN')}`,
                );

        expect(respuesta.status).toBe(200);

        expect(
            respuesta.body.data.usuario.rol.cod,
        ).toBe('ADMIN');
    });
});