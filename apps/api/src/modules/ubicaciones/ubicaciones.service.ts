import { Prisma } from "@prisma/client";

import { AppError } from "../../errors/AppError.js";

import * as repository from "./ubicaciones.repository.js";

import type { CreateUbicacionInput, ListarUbicacionesInput, UpdateUbicacionInput } from "./ubicaciones.schema.js";

async function validarClienteActivo(clienteId: number) {
    const cliente = await repository.buscarCliente(clienteId);

    if (!cliente) {
        throw new AppError(404, "El cliente no existe.");
    }

    if (!cliente.activo) {
        throw new AppError(409, "No se pueden registrar o reactivar ubicaciones para un cliente inactivo.");
    }
}

function traducirErrorPrisma(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
            throw new AppError(409, "La ubicación hace referencia a un cliente no válido.");
        }

        if (error.code === "P2025") {
            throw new AppError(404, "La ubicación no existe.");
        }
    }

    throw error;
}

export async function crear(datos: CreateUbicacionInput) {
    await validarClienteActivo(datos.clienteId);

    try {
        return await repository.crear(datos);
    } catch (error) {
        traducirErrorPrisma(error);
    }
}

export function listar(filtros: ListarUbicacionesInput) {
    return repository.listar(filtros);
}

export async function obtener(id: number) {
    const ubicacion = await repository.buscarPorId(id);

    if (!ubicacion) {
        throw new AppError(404, "La ubicación no existe.");
    }

    return ubicacion;
}

export async function actualizar(id: number, datos: UpdateUbicacionInput) {
    await obtener(id);

    try {
        return await repository.actualizar(id, datos);
    } catch (error) {
        traducirErrorPrisma(error);
    }
}

export async function cambiarEstado(id: number, activa: boolean) {
    const ubicacion = await obtener(id);

    if (ubicacion.activa === activa) {
        return ubicacion;
    }

    if (activa) {
        await validarClienteActivo(ubicacion.clienteId);
    }

    try {
        return await repository.cambiarEstado(id, activa);
    } catch (error) {
        traducirErrorPrisma(error);
    }
}
