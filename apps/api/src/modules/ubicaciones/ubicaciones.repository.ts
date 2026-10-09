import { prisma } from "../../infrastructure/prisma.js";
import { paginaDesde } from "../../shared/pagination.js";

import type { CreateUbicacionInput, ListarUbicacionesInput, UpdateUbicacionInput } from "./ubicaciones.schema.js";

const ubicacionSelect = {
    id: true,
    clienteId: true,
    nombre: true,
    direccion: true,
    referencia: true,
    contactoNombre: true,
    contactoTelefono: true,
    activa: true,
    creadaEn: true,
    actualizadaEn: true,

    cliente: {
        select: {
            id: true,
            codigo: true,
            activo: true,

            persona: {
                select: {
                    firstName: true,
                    firstLastName: true,
                },
            },

            organizacion: {
                select: {
                    razonSocial: true,
                    nombreComercial: true,
                },
            },
        },
    },

    _count: {
        select: {
            equipos: true,
        },
    },
} as const;

export function buscarCliente(clienteId: number) {
    return prisma.cliente.findUnique({
        where: {
            id: clienteId,
        },

        select: {
            id: true,
            activo: true,
        },
    });
}

export function buscarPorId(id: number) {
    return prisma.ubicacion.findUnique({
        where: {
            id,
        },

        select: ubicacionSelect,
    });
}

export function crear(datos: CreateUbicacionInput) {
    return prisma.ubicacion.create({
        data: {
            clienteId: datos.clienteId,
            nombre: datos.nombre,
            direccion: datos.direccion,
            referencia: datos.referencia ?? null,
            contactoNombre: datos.contactoNombre ?? null,
            contactoTelefono: datos.contactoTelefono ?? null,
        },

        select: ubicacionSelect,
    });
}

export async function listar(filtros: ListarUbicacionesInput) {
    const items = await prisma.ubicacion.findMany({
        where: {
            ...(filtros.clienteId !== undefined ? { clienteId: filtros.clienteId } : {}),

            ...(filtros.estado !== "todos" ? { activa: filtros.estado === "activos" } : {}),

            ...(filtros.nombre
                ? {
                      nombre: {
                          contains: filtros.nombre,
                          mode: "insensitive" as const,
                      },
                  }
                : {}),
        },

        select: ubicacionSelect,

        orderBy: [{ cliente: { codigo: "asc" } }, { nombre: "asc" }, { id: "asc" }],

        skip: (filtros.pagina - 1) * filtros.limite,
        take: filtros.limite + 1,
    });

    return paginaDesde(items, filtros);
}

export function actualizar(id: number, datos: UpdateUbicacionInput) {
    return prisma.ubicacion.update({
        where: {
            id,
        },

        data: datos,

        select: ubicacionSelect,
    });
}

export function cambiarEstado(id: number, activa: boolean) {
    return prisma.ubicacion.update({
        where: {
            id,
        },

        data: {
            activa,
        },

        select: ubicacionSelect,
    });
}
