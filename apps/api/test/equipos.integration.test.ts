
import request from "supertest";
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/infrastructure/prisma.js";
import { hashPassword } from "../src/security/password.js";

const PASSWORD = "TrackOnEquiposTest123!";

const cuentas = {
    ADMIN: {
        identificador: "admin.equipos.test",
        codigo: "TEST-EQ-ADMIN",
    },
    TEC: {
        identificador: "tecnico.equipos.test",
        codigo: "TEST-EQ-TEC",
    },
} as const;

const tokens: Partial<Record<"ADMIN" | "TEC", string>> = {};

let clienteId: number;
let personaId: number;
let ubicacionId: number;
let ubicacionSecundariaId: number;
let ubicacionInactivaId: number;

let equipoId: number;
let equipoSecundarioId: number;

const sufijo = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const codigoEquipo = `EQ-TK03-${sufijo}`;
const codigoSecundario = `EQ2-${sufijo}`;

function autorizacion(rol: "ADMIN" | "TEC") {
    const token = tokens[rol];

    if (!token) {
        throw new Error(`No existe token para ${rol}`);
    }

    return `Bearer ${token}`;
}

async function prepararUsuario(rolCodigo: "ADMIN" | "TEC") {
    const cuenta = cuentas[rolCodigo];

    const rol = await prisma.rol.upsert({
        where: { cod: rolCodigo },
        update: {},
        create: {
            cod: rolCodigo,
            nombre: rolCodigo === "ADMIN"
                ? "Administrador"
                : "Técnico",
        },
    });

    const empleado = await prisma.empleado.upsert({
        where: { codEmpleado: cuenta.codigo },
        update: {
            active: true,
            habilitadoComoTecnico: rolCodigo === "TEC",
        },
        create: {
            codEmpleado: cuenta.codigo,
            active: true,
            habilitadoComoTecnico: rolCodigo === "TEC",
            persona: {
                create: {
                    firstName: "Prueba",
                    firstLastName: "Equipos",
                },
            },
        },
    });

    const passwordHash = await hashPassword(PASSWORD);

    await prisma.usuario.upsert({
        where: { identificador: cuenta.identificador },
        update: {
            empleadoId: empleado.id,
            rolId: rol.id,
            passwordHash,
            activo: true,
        },
        create: {
            empleadoId: empleado.id,
            rolId: rol.id,
            identificador: cuenta.identificador,
            passwordHash,
            activo: true,
        },
    });

    const respuesta = await request(app)
        .post("/api/auth/login")
        .send({
            identificador: cuenta.identificador,
            password: PASSWORD,
        });

    expect(respuesta.status).toBe(200);
    tokens[rolCodigo] = respuesta.body.data.accessToken;
}

beforeAll(async () => {
    await prepararUsuario("ADMIN");
    await prepararUsuario("TEC");

    const cliente = await prisma.cliente.create({
        data: {
            codigo: `CLI-${sufijo}`,
            persona: {
                create: {
                    firstName: "Cliente",
                    firstLastName: "Equipos",
                },
            },
        },
        select: {
            id: true,
            personaId: true,
        },
    });

    clienteId = cliente.id;
    personaId = cliente.personaId!;

    const ubicaciones = await Promise.all([
        prisma.ubicacion.create({
            data: {
                clienteId,
                nombre: "Sucursal principal",
                direccion: "Managua",
            },
        }),
        prisma.ubicacion.create({
            data: {
                clienteId,
                nombre: "Sucursal secundaria",
                direccion: "Masaya",
            },
        }),
        prisma.ubicacion.create({
            data: {
                clienteId,
                nombre: "Sucursal inactiva",
                direccion: "León",
                activa: false,
            },
        }),
    ]);

    ubicacionId = ubicaciones[0].id;
    ubicacionSecundariaId = ubicaciones[1].id;
    ubicacionInactivaId = ubicaciones[2].id;
});

afterAll(async () => {
    if (clienteId !== undefined) {
        await prisma.equipo.deleteMany({
            where: {
                ubicacion: { clienteId },
            },
        });

        await prisma.ubicacion.deleteMany({
            where: { clienteId },
        });

        await prisma.cliente.delete({
            where: { id: clienteId },
        });
    }

    if (personaId !== undefined) {
        await prisma.persona.delete({
            where: { id: personaId },
        });
    }

    await prisma.$disconnect();
});

describe("TK-03 Gestión de equipos", () => {
    it("requiere autenticación", async () => {
        const respuesta = await request(app)
            .get("/api/equipos");

        expect(respuesta.status).toBe(401);
    });

    it("ADMIN registra un equipo", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId,
                codigo: codigoEquipo.toLowerCase(),
                tipo: "Aire acondicionado",
                marca: "Carrier",
                modelo: "Split 12000",
                numeroSerie: `SER-${sufijo}`,
            });

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.codigo).toBe(codigoEquipo);
        expect(respuesta.body.data.activo).toBe(true);
        expect(respuesta.body.data.ubicacion.id).toBe(ubicacionId);

        equipoId = respuesta.body.data.id;
    });

    it("rechaza códigos duplicados", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId,
                codigo: codigoEquipo,
                tipo: "Refrigerador",
            });

        expect(respuesta.status).toBe(409);
    });

    it("rechaza registros incompletos", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId,
            });

        expect(respuesta.status).toBe(400);
    });

    it("rechaza registrar equipos en ubicaciones inactivas", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId: ubicacionInactivaId,
                codigo: `INACT-${sufijo}`,
                tipo: "Refrigerador",
            });

        expect(respuesta.status).toBe(400);
    });

    it("TEC puede consultar equipos", async () => {
        const respuesta = await request(app)
            .get(`/api/equipos/${equipoId}`)
            .set("Authorization", autorizacion("TEC"));

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.id).toBe(equipoId);
    });

    it("TEC no puede registrar equipos", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("TEC"))
            .send({
                ubicacionId,
                codigo: `TEC-${sufijo}`,
                tipo: "Congelador",
            });

        expect(respuesta.status).toBe(403);
    });

    it("permite filtrar equipos por cliente y código", async () => {
        const respuesta = await request(app)
            .get("/api/equipos")
            .query({
                clienteId,
                codigo: "EQ-TK03",
                estado: "todos",
            })
            .set("Authorization", autorizacion("ADMIN"));

        expect(respuesta.status).toBe(200);

        expect(
            respuesta.body.data.items.some(
                (equipo: { id: number }) => equipo.id === equipoId,
            ),
        ).toBe(true);
    });

    it("actualiza los datos técnicos del equipo", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                marca: "LG",
                modelo: "Dual Inverter",
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.marca).toBe("LG");
        expect(respuesta.body.data.modelo).toBe("Dual Inverter");
    });

    it("permite cambiar el equipo a otra ubicación activa", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId: ubicacionSecundariaId,
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.ubicacion.id)
            .toBe(ubicacionSecundariaId);
    });

    it("rechaza trasladar un equipo a una ubicación inactiva", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId: ubicacionInactivaId,
            });

        expect(respuesta.status).toBe(400);
    });

    it("rechaza una actualización vacía", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({});

        expect(respuesta.status).toBe(400);
    });

    it("desactiva un equipo", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}/estado`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({ activo: false });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.activo).toBe(false);
    });

    it("filtra equipos inactivos", async () => {
        const respuesta = await request(app)
            .get("/api/equipos")
            .query({
                clienteId,
                estado: "inactivos",
            })
            .set("Authorization", autorizacion("ADMIN"));

        expect(respuesta.status).toBe(200);

        expect(
            respuesta.body.data.items.some(
                (equipo: { id: number }) => equipo.id === equipoId,
            ),
        ).toBe(true);
    });

    it("reactiva un equipo", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}/estado`)
            .set("Authorization", autorizacion("ADMIN"))
            .send({ activo: true });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.activo).toBe(true);
    });

    it("comprueba la paginación", async () => {
        const creado = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizacion("ADMIN"))
            .send({
                ubicacionId,
                codigo: codigoSecundario,
                tipo: "Congelador",
            });

        expect(creado.status).toBe(201);
        equipoSecundarioId = creado.body.data.id;

        const primera = await request(app)
            .get("/api/equipos")
            .query({
                clienteId,
                pagina: 1,
                limite: 1,
            })
            .set("Authorization", autorizacion("ADMIN"));

        const segunda = await request(app)
            .get("/api/equipos")
            .query({
                clienteId,
                pagina: 2,
                limite: 1,
            })
            .set("Authorization", autorizacion("ADMIN"));

        expect(primera.status).toBe(200);
        expect(segunda.status).toBe(200);
        expect(primera.body.data.hayMas).toBe(true);
        expect(segunda.body.data.items).toHaveLength(1);

        expect(
            primera.body.data.items[0].id,
        ).not.toBe(segunda.body.data.items[0].id);
    });

    it("rechaza consultar un equipo inexistente", async () => {
        const respuesta = await request(app)
            .get("/api/equipos/2147483647")
            .set("Authorization", autorizacion("ADMIN"));

        expect(respuesta.status).toBe(404);
    });

    it("TEC no puede modificar el estado de un equipo", async () => {
        const respuesta = await request(app)
            .patch(`/api/equipos/${equipoId}/estado`)
            .set("Authorization", autorizacion("TEC"))
            .send({ activo: false });

        expect(respuesta.status).toBe(403);
    });
});
