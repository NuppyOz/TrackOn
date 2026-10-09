
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

const PASSWORD = "TrackOnUbicacionesTest123!";
const IDENTIFICADOR = "admin.ubicaciones.test";

let adminToken = "";

let clienteId: number;
let clienteInactivoId: number;

let ubicacionInicialId: number;
let ubicacionNuevaId: number;

let personaId: number;
let personaInactivaId: number;

function autorizado() {
    return `Bearer ${adminToken}`;
}

beforeAll(async () => {
    const rol = await prisma.rol.upsert({
        where: {
            cod: "ADMIN",
        },
        update: {},
        create: {
            cod: "ADMIN",
            nombre: "Administrador",
        },
    });

    const empleado = await prisma.empleado.upsert({
        where: {
            codEmpleado: "TEST-UBIC-ADMIN",
        },
        update: {
            active: true,
        },
        create: {
            codEmpleado: "TEST-UBIC-ADMIN",
            active: true,
            persona: {
                create: {
                    firstName: "Admin",
                    firstLastName: "Ubicaciones",
                },
            },
        },
    });

    const passwordHash = await hashPassword(PASSWORD);

    await prisma.usuario.upsert({
        where: {
            identificador: IDENTIFICADOR,
        },
        update: {
            rolId: rol.id,
            empleadoId: empleado.id,
            activo: true,
            passwordHash,
        },
        create: {
            identificador: IDENTIFICADOR,
            rolId: rol.id,
            empleadoId: empleado.id,
            activo: true,
            passwordHash,
        },
    });

    const login = await request(app)
        .post("/api/auth/login")
        .send({
            identificador: IDENTIFICADOR,
            password: PASSWORD,
        });

    expect(login.status).toBe(200);

    adminToken = login.body.data.accessToken;

    const sufijo = `${Date.now()}${Math.floor(
        Math.random() * 1000,
    )}`;

    const cliente = await prisma.cliente.create({
        data: {
            codigo: `UB-${sufijo}`,
            persona: {
                create: {
                    firstName: "Cliente",
                    firstLastName: "Ubicaciones",
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

    const inactivo = await prisma.cliente.create({
        data: {
            codigo: `UI-${sufijo}`,
            activo: false,
            persona: {
                create: {
                    firstName: "Cliente",
                    firstLastName: "Inactivo",
                },
            },
        },
        select: {
            id: true,
            personaId: true,
        },
    });

    clienteInactivoId = inactivo.id;
    personaInactivaId = inactivo.personaId!;

    const ubicada = await prisma.ubicacion.create({
        data: {
            clienteId,
            nombre: "Taller de prueba",
            direccion: "Managua, Nicaragua",
        },
    });

    ubicacionInicialId = ubicada.id;
});

afterAll(async () => {
    const ids = [
        clienteId,
        clienteInactivoId,
    ].filter((id): id is number => id !== undefined);

    if (ids.length > 0) {
        await prisma.equipo.deleteMany({
            where: {
                ubicacion: {
                    clienteId: {
                        in: ids,
                    },
                },
            },
        });

        await prisma.ubicacion.deleteMany({
            where: {
                clienteId: {
                    in: ids,
                },
            },
        });

        await prisma.cliente.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
    }

    const personas = [
        personaId,
        personaInactivaId,
    ].filter((id): id is number => id !== undefined);

    if (personas.length > 0) {
        await prisma.persona.deleteMany({
            where: {
                id: {
                    in: personas,
                },
            },
        });
    }

    await prisma.$disconnect();
});

describe("TK-02 Gestión de ubicaciones", () => {
    it("responde 401 sin autenticación", async () => {
        const respuesta = await request(app)
            .get("/api/ubicaciones");

        expect(respuesta.status).toBe(401);
    });

    it("registra una ubicación para un cliente activo", async () => {
        const respuesta = await request(app)
            .post("/api/ubicaciones")
            .set("Authorization", autorizado())
            .send({
                clienteId,
                nombre: "Sucursal Norte",
                direccion: "Managua, Carretera Norte",
                contactoNombre: "Responsable de sucursal",
                contactoTelefono: "88888888",
            });

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.cliente.id).toBe(clienteId);
        expect(respuesta.body.data.activa).toBe(true);

        ubicacionNuevaId = respuesta.body.data.id;
    });

    it("lista ubicaciones con paginación y filtro por cliente", async () => {
        const respuesta = await request(app)
            .get(
                `/api/ubicaciones?clienteId=${clienteId}&limite=1&pagina=1&estado=todos`,
            )
            .set("Authorization", autorizado());

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.items).toHaveLength(1);
        expect(respuesta.body.data.hayMas).toBe(true);
    });

    it("consulta detalle y cantidad de equipos", async () => {
        const respuesta = await request(app)
            .get(`/api/ubicaciones/${ubicacionInicialId}`)
            .set("Authorization", autorizado());

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.id).toBe(ubicacionInicialId);
        expect(respuesta.body.data._count.equipos).toBe(0);
    });

    it("actualiza una ubicación conservando clienteId", async () => {
        const respuesta = await request(app)
            .patch(`/api/ubicaciones/${ubicacionInicialId}`)
            .set("Authorization", autorizado())
            .send({
                nombre: "Taller actualizado",
                referencia: null,
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.nombre).toBe(
            "Taller actualizado",
        );
        expect(respuesta.body.data.clienteId).toBe(clienteId);
    });

    it("rechaza una actualización vacía y un cambio de cliente", async () => {
        const ruta = `/api/ubicaciones/${ubicacionInicialId}`;

        const vacio = await request(app)
            .patch(ruta)
            .set("Authorization", autorizado())
            .send({});

        const traslado = await request(app)
            .patch(ruta)
            .set("Authorization", autorizado())
            .send({
                clienteId: clienteInactivoId,
            });

        expect(vacio.status).toBe(400);
        expect(traslado.status).toBe(400);
    });

    it("responde 404 para una ubicación inexistente", async () => {
        const respuesta = await request(app)
            .get("/api/ubicaciones/2147483647")
            .set("Authorization", autorizado());

        expect(respuesta.status).toBe(404);
    });

    it("rechaza la creación para un cliente inexistente", async () => {
        const respuesta = await request(app)
            .post("/api/ubicaciones")
            .set("Authorization", autorizado())
            .send({
                clienteId: 2147483647,
                nombre: "Ubicación inválida",
                direccion: "Managua",
            });

        expect(respuesta.status).toBe(404);
    });

    it("rechaza la creación para un cliente inactivo", async () => {
        const respuesta = await request(app)
            .post("/api/ubicaciones")
            .set("Authorization", autorizado())
            .send({
                clienteId: clienteInactivoId,
                nombre: "Ubicación inválida",
                direccion: "Managua",
            });

        expect(respuesta.status).toBe(409);
    });

    it("rechaza registrar una ubicación sin dirección", async () => {
        const respuesta = await request(app)
            .post("/api/ubicaciones")
            .set("Authorization", autorizado())
            .send({
                clienteId,
                nombre: "Incompleta",
            });

        expect(respuesta.status).toBe(400);
    });

    it("desactiva una ubicación y permite filtrarla", async () => {
        const respuesta = await request(app)
            .patch(`/api/ubicaciones/${ubicacionNuevaId}/estado`)
            .set("Authorization", autorizado())
            .send({
                activa: false,
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.activa).toBe(false);

        const listado = await request(app)
            .get(
                `/api/ubicaciones?clienteId=${clienteId}&estado=inactivos`,
            )
            .set("Authorization", autorizado());

        expect(listado.status).toBe(200);

        expect(
            listado.body.data.items.some(
                (ubicacion: { id: number }) =>
                    ubicacion.id === ubicacionNuevaId,
            ),
        ).toBe(true);
    });

    it("impide registrar equipos en una ubicación inactiva", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", autorizado())
            .send({
                ubicacionId: ubicacionNuevaId,
                codigo: `U-INACTIVO-${ubicacionNuevaId}`,
                tipo: "Aire acondicionado",
            });

        expect(respuesta.status).toBe(400);
    });

    it("reactiva una ubicación de un cliente activo", async () => {
        const respuesta = await request(app)
            .patch(`/api/ubicaciones/${ubicacionNuevaId}/estado`)
            .set("Authorization", autorizado())
            .send({
                activa: true,
            });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.activa).toBe(true);
    });

    it("rechaza reactivar una ubicación si su cliente está inactivo", async () => {
        await prisma.ubicacion.update({
            where: {
                id: ubicacionNuevaId,
            },
            data: {
                activa: false,
            },
        });

        await prisma.cliente.update({
            where: {
                id: clienteId,
            },
            data: {
                activo: false,
            },
        });

        try {
            const respuesta = await request(app)
                .patch(
                    `/api/ubicaciones/${ubicacionNuevaId}/estado`,
                )
                .set("Authorization", autorizado())
                .send({
                    activa: true,
                });

            expect(respuesta.status).toBe(409);
        } finally {
            await prisma.cliente.update({
                where: {
                    id: clienteId,
                },
                data: {
                    activo: true,
                },
            });
        }
    });
});
