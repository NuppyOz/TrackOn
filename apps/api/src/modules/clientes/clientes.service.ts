import { Prisma } from '@prisma/client';

import { AppError } from "../../errors/AppError.js";

import * as clientesRepository from "./clientes.repository.js";

import type { CreateClienteInput } from "./clientes.schema.js";

export async function crearCliente(datos: CreateClienteInput) {
    const clienteConCodigo = await clientesRepository.buscarClientePorCodigo(datos.codigo);

    if (clienteConCodigo) {
        throw new AppError(409, "El código del cliente ya está siendo utilizado.");
    }

    let personaIdExistente: number | undefined;

    if (datos.tipo === "NATURAL") {
        const typeDocument = datos.persona.typeDocument;

        const numberDocument = datos.persona.numberDocument;

        if (!typeDocument || !numberDocument) {
            throw new AppError(400, "El cliente natural debe tener un documento de identidad.");
        }

        const personaExistente = await clientesRepository.buscarPersonaPorDocumento(typeDocument, numberDocument);

        if (personaExistente) {
            if (personaExistente.cliente) {
                throw new AppError(409, "Ya existe un cliente registrado con este documento de identidad.");
            }

            personaIdExistente = personaExistente.id;
        }
    }

    if (datos.tipo === "EMPRESA" && datos.organizacion.identificacionTributaria) {
        const organizacionExistente = await clientesRepository.buscarOrganizacionPorIdentificacionTributaria(
            datos.organizacion.identificacionTributaria,
        );

        if (organizacionExistente) {
            throw new AppError(409, "El RUC ya está siendo utilizado por otra organización.");
        }
    }

    try {
        return await clientesRepository.crearCliente(datos, personaIdExistente);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new AppError(
                409,
                "Los datos de identificación del cliente entran en conflicto con un registro existente.",
            );
        }

        throw error;
    }
}

export async function listarClientes() {
    return clientesRepository.listarClientes();
}

export async function obtenerClientePorId(
    id: number,
) {
    const cliente =
        await clientesRepository
            .buscarClientePorId(id);

    if (!cliente) {
        throw new AppError(
            404,
            "Cliente no encontrado.",
        );
    }

    return cliente;
}

export async function actualizarEstadoCliente(
    id: number,
    activo: boolean,
) {
    const cliente =
        await clientesRepository
            .buscarClientePorId(id);

    if (!cliente) {
        throw new AppError(
            404,
            "Cliente no encontrado.",
        );
    }

    return clientesRepository
        .actualizarEstadoCliente(
            id,
            activo,
        );
}
