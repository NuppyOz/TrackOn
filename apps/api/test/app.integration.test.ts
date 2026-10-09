import request from "supertest";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { prisma } from "../src/infrastructure/prisma.js";
import { hashPassword } from "../src/security/password.js";

type RoleCode = "ADMIN" | "GTE_OPE" | "TEC";

const PASSWORD = "TrackOnTest123!";

const cuentas = {
    ADMIN: {
        identificador: "admin.test",
        codEmpleado: "TEST-ADMIN",
    },

    GTE_OPE: {
        identificador: "gerente.test",
        codEmpleado: "TEST-GTE",
    },

    TEC: {
        identificador: "tecnico.test",
        codEmpleado: "TEST-TEC",
    },
} satisfies Record<
    RoleCode,
    {
        identificador: string;
        codEmpleado: string;
    }
>;

const tokens: Partial<Record<RoleCode, string>> = {};

async function prepararUsuario(rolCod: RoleCode) {
    const cuenta = cuentas[rolCod];

    const rol = await prisma.rol.upsert({
        where: {
            cod: rolCod,
        },

        update: {},

        create: {
            cod: rolCod,

            nombre: rolCod === "ADMIN" ? "Administrador" : rolCod === "GTE_OPE" ? "Gerente Operativo" : "Técnico",
        },
    });

    const empleado = await prisma.empleado.upsert({
        where: {
            codEmpleado: cuenta.codEmpleado,
        },

        update: {
            active: true,

            habilitadoComoTecnico: rolCod === "TEC",
        },

        create: {
            codEmpleado: cuenta.codEmpleado,

            active: true,

            habilitadoComoTecnico: rolCod === "TEC",

            persona: {
                create: {
                    firstName: "Usuario",
                    firstLastName: rolCod,
                },
            },
        },
    });

    const passwordHash = await hashPassword(PASSWORD);

    await prisma.usuario.upsert({
        where: {
            identificador: cuenta.identificador,
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
            identificador: cuenta.identificador,
            passwordHash,
            activo: true,
        },
    });
}

async function iniciarSesion(rol: RoleCode) {
    const respuesta = await request(app).post("/api/auth/login").send({
        identificador: cuentas[rol].identificador,

        password: PASSWORD,
    });

    expect(respuesta.status).toBe(200);

    expect(respuesta.body.data.accessToken).toBeTruthy();

    tokens[rol] = respuesta.body.data.accessToken;
}

function token(rol: RoleCode) {
    const valor = tokens[rol];

    if (!valor) {
        throw new Error(`No existe token para ${rol}`);
    }

    return valor;
}

beforeAll(async () => {
    await prepararUsuario("ADMIN");
    await prepararUsuario("GTE_OPE");
    await prepararUsuario("TEC");

    await iniciarSesion("ADMIN");
    await iniciarSesion("GTE_OPE");
    await iniciarSesion("TEC");
});

afterAll(async () => {
    await prisma.$disconnect();
});

describe("Estado de la API", () => {
    it("GET /api/health responde 200", async () => {
        const respuesta = await request(app).get("/api/health");

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.status).toBe("ok");
    });

    it("GET /api/ready responde 200", async () => {
        const respuesta = await request(app).get("/api/ready");

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.database).toBe("connected");
    });
});

describe("Autenticación obligatoria", () => {
    const endpoints = ["/api/equipos", "/api/servicios", "/api/cuadrillas", "/api/notificaciones"];

    for (const endpoint of endpoints) {
        it(`${endpoint} responde 401 sin token`, async () => {
            const respuesta = await request(app).get(endpoint);

            expect(respuesta.status).toBe(401);
        });
    }
});

describe("Rol TEC", () => {
    it("puede consultar equipos", async () => {
        const respuesta = await request(app)
            .get("/api/equipos")
            .set("Authorization", `Bearer ${token("TEC")}`);

        expect(respuesta.status).toBe(200);
    });

    it("puede consultar servicios", async () => {
        const respuesta = await request(app)
            .get("/api/servicios")
            .set("Authorization", `Bearer ${token("TEC")}`);

        expect(respuesta.status).toBe(200);
    });

    it("no puede administrar cuadrillas", async () => {
        const respuesta = await request(app)
            .get("/api/cuadrillas")
            .set("Authorization", `Bearer ${token("TEC")}`);

        expect(respuesta.status).toBe(403);
    });

    it("no puede crear equipos", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", `Bearer ${token("TEC")}`)
            .send({});

        expect(respuesta.status).toBe(403);
    });

    it("no puede crear servicios", async () => {
        const respuesta = await request(app)
            .post("/api/servicios")
            .set("Authorization", `Bearer ${token("TEC")}`)
            .send({});

        expect(respuesta.status).toBe(403);
    });
});

describe("Rol GTE_OPE", () => {
    it("puede consultar equipos", async () => {
        const respuesta = await request(app)
            .get("/api/equipos")
            .set("Authorization", `Bearer ${token("GTE_OPE")}`);

        expect(respuesta.status).toBe(200);
    });

    it("puede administrar cuadrillas", async () => {
        const respuesta = await request(app)
            .get("/api/cuadrillas")
            .set("Authorization", `Bearer ${token("GTE_OPE")}`);

        expect(respuesta.status).toBe(200);
    });

    it("supera RBAC al crear equipos", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", `Bearer ${token("GTE_OPE")}`)
            .send({});

        expect(respuesta.status).toBe(400);
    });
});

describe("Rol ADMIN", () => {
    it("puede consultar equipos", async () => {
        const respuesta = await request(app)
            .get("/api/equipos")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(respuesta.status).toBe(200);
    });

    it("puede administrar cuadrillas", async () => {
        const respuesta = await request(app)
            .get("/api/cuadrillas")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(respuesta.status).toBe(200);
    });

    it("supera RBAC al crear equipos", async () => {
        const respuesta = await request(app)
            .post("/api/equipos")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({});

        expect(respuesta.status).toBe(400);
    });

    it("GET /api/auth/me identifica al administrador", async () => {
        const respuesta = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.data.usuario.rol.cod).toBe("ADMIN");
    });
});

describe("Gestión de clientes", () => {
    let clienteNaturalId: number;
    let clienteNaturalSecundarioId: number;
    let clienteEmpresaId: number;
    let clienteEmpresaSecundariaId: number;

    beforeAll(async () => {
        await prisma.cliente.deleteMany({
            where: {
                codigo: {
                    in: ["TEST-CLI-NAT-01", "TEST-CLI-NAT-02", "TEST-CLI-EMP-01", "TEST-CLI-EMP-02"],
                },
            },
        });

        await prisma.persona.deleteMany({
            where: {
                numberDocument: {
                    in: ["PASS-TRACKON-001", "PASS-TRACKON-002"],
                },
            },
        });

        await prisma.organizacion.deleteMany({
            where: {
                identificacionTributaria: {
                    in: ["J1234567890123", "J9876543210123"],
                },
            },
        });
        const natural = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                codigo: "TEST-CLI-NAT-01",
                tipo: "NATURAL",
                telefonoComercial: "88881111",
                correoComercial: "natural@test.trackon",
                persona: {
                    firstName: "Cliente",
                    firstLastName: "Natural",
                    typeDocument: "PASAPORTE",
                    numberDocument: "PASS-TRACKON-001",
                },
            });

        expect(natural.status).toBe(201);

        clienteNaturalId = natural.body.data.id;

        const naturalSecundario = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                codigo: "TEST-CLI-NAT-02",
                tipo: "NATURAL",
                persona: {
                    firstName: "Cliente",
                    firstLastName: "Secundario",
                    typeDocument: "PASAPORTE",
                    numberDocument: "PASS-TRACKON-002",
                },
            });

        expect(naturalSecundario.status).toBe(201);

        clienteNaturalSecundarioId = naturalSecundario.body.data.id;

        const empresa = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                codigo: "TEST-CLI-EMP-01",
                tipo: "EMPRESA",
                telefonoComercial: "22221111",
                correoComercial: "empresa@test.trackon",
                organizacion: {
                    razonSocial: "Empresa TrackOn Uno S.A.",
                    nombreComercial: "Empresa TrackOn Uno",
                    identificacionTributaria: "J1234567890123",
                },
            });

        expect(empresa.status).toBe(201);

        clienteEmpresaId = empresa.body.data.id;

        const empresaSecundaria = await request(app)
            .post("/api/clientes")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                codigo: "TEST-CLI-EMP-02",
                tipo: "EMPRESA",
                organizacion: {
                    razonSocial: "Empresa TrackOn Dos S.A.",
                    identificacionTributaria: "J9876543210123",
                },
            });

        expect(empresaSecundaria.status).toBe(201);

        clienteEmpresaSecundariaId = empresaSecundaria.body.data.id;
    });

    it("ADMIN puede editar datos comunes y personales de un cliente natural", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                telefonoComercial: "88889999",

                persona: {
                    firstName: "Cliente Actualizado",
                },
            });

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.data.telefonoComercial).toBe("88889999");

        expect(respuesta.body.data.persona.firstName).toBe("Cliente Actualizado");
    });

    it("GTE_OPE puede editar datos de una empresa", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteEmpresaId}`)
            .set("Authorization", `Bearer ${token("GTE_OPE")}`)
            .send({
                organizacion: {
                    nombreComercial: "TrackOn Comercial",
                },
            });

        expect(respuesta.status).toBe(200);

        expect(respuesta.body.data.organizacion.nombreComercial).toBe("TrackOn Comercial");
    });

    it("rechaza una actualización vacía", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({});

        expect(respuesta.status).toBe(400);
    });

    it("responde 404 al actualizar un cliente inexistente", async () => {
        const respuesta = await request(app)
            .patch("/api/clientes/2147483647")
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                telefonoComercial: "88880000",
            });

        expect(respuesta.status).toBe(404);
    });

    it("rechaza un código utilizado por otro cliente", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                codigo: "TEST-CLI-NAT-02",
            });

        expect(respuesta.status).toBe(409);
    });

    it("rechaza un documento utilizado por otra persona", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                persona: {
                    numberDocument: "PASS-TRACKON-002",
                },
            });

        expect(respuesta.status).toBe(409);
    });

    it("rechaza un RUC utilizado por otra organización", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteEmpresaId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                organizacion: {
                    identificacionTributaria: "J9876543210123",
                },
            });

        expect(respuesta.status).toBe(409);
    });

    it("impide aplicar datos de organización a un cliente natural", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                organizacion: {
                    nombreComercial: "No permitido",
                },
            });

        expect(respuesta.status).toBe(409);
    });

    it("impide aplicar datos de persona a un cliente empresa", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteEmpresaSecundariaId}`)
            .set("Authorization", `Bearer ${token("ADMIN")}`)
            .send({
                persona: {
                    firstName: "No permitido",
                },
            });

        expect(respuesta.status).toBe(409);
    });

    it("TEC no puede editar clientes", async () => {
        const respuesta = await request(app)
            .patch(`/api/clientes/${clienteNaturalSecundarioId}`)
            .set("Authorization", `Bearer ${token("TEC")}`)
            .send({
                telefonoComercial: "88887777",
            });

        expect(respuesta.status).toBe(403);
    });
});

describe("Notificaciones autenticadas", () => {
    it("permite listar, contar y marcar una notificación como leída", async () => {
        const admin = await prisma.usuario.findUniqueOrThrow({
            where: {
                identificador: cuentas.ADMIN.identificador,
            },
            select: {
                id: true,
            },
        });

        const notificacion = await prisma.notificacion.create({
            data: {
                usuarioId: admin.id,
                tipo: "PRUEBA",
                mensaje: "Notificación creada para pruebas de integración",
            },
        });

        const conteoInicial = await request(app)
            .get("/api/notificaciones/unread-count")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(conteoInicial.status).toBe(200);

        expect(conteoInicial.body.data.noLeidas).toBeGreaterThanOrEqual(1);

        const listado = await request(app)
            .get("/api/notificaciones")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(listado.status).toBe(200);

        expect(listado.body.data.items.some((item: { id: number }) => item.id === notificacion.id)).toBe(true);

        const marcada = await request(app)
            .patch(`/api/notificaciones/${notificacion.id}/leida`)
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(marcada.status).toBe(200);

        expect(marcada.body.data.id).toBe(notificacion.id);

        const guardada = await prisma.notificacion.findUniqueOrThrow({
            where: {
                id: notificacion.id,
            },
            select: {
                leidaEn: true,
            },
        });

        expect(guardada.leidaEn).not.toBeNull();
    });

    it("responde 404 al marcar una notificación inexistente", async () => {
        const respuesta = await request(app)
            .patch("/api/notificaciones/2147483647/leida")
            .set("Authorization", `Bearer ${token("ADMIN")}`);

        expect(respuesta.status).toBe(404);
    });
});
