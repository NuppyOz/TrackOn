import { prisma } from "../../infrastructure/prisma.js";

import type { CreateClienteInput, UpdateClienteInput } from "./clientes.schema.js";
import type { ListarClientesInput } from "./clientes.schema.js";
import { paginaDesde } from "../../shared/pagination.js";

const clienteSelect = {
    id: true,
    codigo: true,
    telefonoComercial: true,
    correoComercial: true,
    activo: true,
    creadoEn: true,
    actualizadoEn: true,

    persona: {
        select: {
            id: true,
            firstName: true,
            secondName: true,
            firstLastName: true,
            secondLastName: true,
            typeDocument: true,
            numberDocument: true,
            telephone: true,
            correo: true,
        },
    },

    organizacion: {
        select: {
            id: true,
            razonSocial: true,
            nombreComercial: true,
            identificacionTributaria: true,
        },
    },
} as const;

export function buscarClientePorCodigo(codigo: string) {
    return prisma.cliente.findUnique({
        where: {
            codigo,
        },

        select: {
            id: true,
            codigo: true,
        },
    });
}

export function buscarPersonaPorDocumento(typeDocument: string, numberDocument: string) {
    return prisma.persona.findFirst({
        where: {
            typeDocument,
            numberDocument,
        },

        select: {
            id: true,
            typeDocument: true,
            numberDocument: true,

            cliente: {
                select: {
                    id: true,
                    codigo: true,
                },
            },
        },
    });
}

export function buscarOrganizacionPorIdentificacionTributaria(identificacionTributaria: string) {
    return prisma.organizacion.findUnique({
        where: {
            identificacionTributaria,
        },

        select: {
            id: true,
            identificacionTributaria: true,

            cliente: {
                select: {
                    id: true,
                    codigo: true,
                },
            },
        },
    });
}

export function crearCliente(datos: CreateClienteInput, personaIdExistente?: number) {
    if (datos.tipo === "NATURAL") {
        return prisma.cliente.create({
            data: {
                codigo: datos.codigo,

                telefonoComercial: datos.telefonoComercial ?? null,

                correoComercial: datos.correoComercial ?? null,

                persona:
                    personaIdExistente !== undefined
                        ? {
                              connect: {
                                  id: personaIdExistente,
                              },
                          }
                        : {
                              create: {
                                  firstName: datos.persona.firstName,

                                  secondName: datos.persona.secondName ?? null,

                                  firstLastName: datos.persona.firstLastName,

                                  secondLastName: datos.persona.secondLastName ?? null,

                                  typeDocument: datos.persona.typeDocument ?? null,

                                  numberDocument: datos.persona.numberDocument ?? null,

                                  telephone: datos.persona.telephone ?? null,

                                  correo: datos.persona.correo ?? null,
                              },
                          },
            },

            select: clienteSelect,
        });
    }

    return prisma.cliente.create({
        data: {
            codigo: datos.codigo,

            telefonoComercial: datos.telefonoComercial ?? null,

            correoComercial: datos.correoComercial ?? null,

            organizacion: {
                create: {
                    razonSocial: datos.organizacion.razonSocial,

                    nombreComercial: datos.organizacion.nombreComercial ?? null,

                    identificacionTributaria: datos.organizacion.identificacionTributaria ?? null,
                },
            },
        },

        select: clienteSelect,
    });
}

export async function listarClientes(filtros: ListarClientesInput) {
    const items = await prisma.cliente.findMany({
        where: {
            ...(filtros.estado === "todos" ? {} : { activo: filtros.estado === "activos" }),
            ...(filtros.tipo === "NATURAL" ? { personaId: { not: null } } : {}),
            ...(filtros.tipo === "EMPRESA" ? { organizacionId: { not: null } } : {}),
            ...(filtros.buscar ? { OR: [
                { codigo: { contains: filtros.buscar, mode: "insensitive" } },
                { persona: { is: { OR: [
                    { firstName: { contains: filtros.buscar, mode: "insensitive" } },
                    { firstLastName: { contains: filtros.buscar, mode: "insensitive" } },
                    { numberDocument: { contains: filtros.buscar, mode: "insensitive" } },
                ] } } },
                { organizacion: { is: { OR: [
                    { razonSocial: { contains: filtros.buscar, mode: "insensitive" } },
                    { nombreComercial: { contains: filtros.buscar, mode: "insensitive" } },
                    { identificacionTributaria: { contains: filtros.buscar, mode: "insensitive" } },
                ] } } },
            ] } : {}),
        },
        select: clienteSelect,
        orderBy: { codigo: "asc" },
        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });
    return paginaDesde(items, filtros);
}

export function buscarClientePorId(id: number) {
    return prisma.cliente.findUnique({
        where: {
            id,
        },

        select: clienteSelect,
    });
}

export function actualizarEstadoCliente(id: number, activo: boolean) {
    return prisma.cliente.update({
        where: {
            id,
        },

        data: {
            activo,
        },

        select: clienteSelect,
    });
}

export function actualizarCliente(
    id: number,
    datos: UpdateClienteInput,
) {
    return prisma.cliente.update({
        where: {
            id,
        },

        data: {
            ...(datos.codigo !== undefined
                ? {
                      codigo: datos.codigo,
                  }
                : {}),

            ...(datos.telefonoComercial !== undefined
                ? {
                      telefonoComercial:
                          datos.telefonoComercial,
                  }
                : {}),

            ...(datos.correoComercial !== undefined
                ? {
                      correoComercial:
                          datos.correoComercial,
                  }
                : {}),

            ...(datos.persona !== undefined
                ? {
                      persona: {
                          update: datos.persona,
                      },
                  }
                : {}),

            ...(datos.organizacion !== undefined
                ? {
                      organizacion: {
                          update:
                              datos.organizacion,
                      },
                  }
                : {}),
        },

        select: clienteSelect,
    });
}
