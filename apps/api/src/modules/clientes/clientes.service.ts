import { Prisma } from "@prisma/client";

import { AppError } from "../../errors/AppError.js";

import {
    esCedulaNicaraguenseValida,
    normalizarNumeroDocumento,
    tipoDocumentoPersonaSchema,
} from "../personas/personas.schema.js";

import * as clientesRepository from "./clientes.repository.js";

import type { CreateClienteInput, UpdateClienteInput } from "./clientes.schema.js";

type ClienteEncontrado = NonNullable<Awaited<ReturnType<typeof clientesRepository.buscarClientePorId>>>;

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

export function listarClientes() {
    return clientesRepository.listarClientes();
}

export async function obtenerClientePorId(id: number) {
    const cliente = await clientesRepository.buscarClientePorId(id);

    if (!cliente) {
        throw new AppError(404, "Cliente no encontrado.");
    }

    return cliente;
}

async function validarCodigoActualizado(
    id: number,
    codigoActual: string,
    codigoNuevo: string | undefined,
) {
    if (
        codigoNuevo === undefined ||
        codigoNuevo === codigoActual
    ) {
        return;
    }

    const clienteConCodigo =
        await clientesRepository.buscarClientePorCodigo(
            codigoNuevo,
        );

    if (
        clienteConCodigo &&
        clienteConCodigo.id !== id
    ) {
        throw new AppError(
            409,
            "El código del cliente ya está siendo utilizado.",
        );
    }
}

async function validarPersonaActualizada(
    cliente: ClienteEncontrado,
    datos: UpdateClienteInput,
) {
    if (datos.persona === undefined) {
        return;
    }

    if (!cliente.persona) {
        throw new AppError(
            409,
            "No puedes actualizar datos de persona natural en un cliente empresa.",
        );
    }

    const tipoDocumentoFinal =
        datos.persona.typeDocument !== undefined
            ? datos.persona.typeDocument
            : cliente.persona.typeDocument;

    const numeroDocumentoFinal =
        datos.persona.numberDocument !== undefined
            ? datos.persona.numberDocument
            : cliente.persona.numberDocument;

    if (
        tipoDocumentoFinal == null ||
        numeroDocumentoFinal == null
    ) {
        throw new AppError(
            400,
            "El cliente natural debe mantener un tipo y número de documento de identidad.",
        );
    }

    const resultadoTipoDocumento =
        tipoDocumentoPersonaSchema.safeParse(
            tipoDocumentoFinal,
        );

    if (!resultadoTipoDocumento.success) {
        throw new AppError(
            400,
            "El tipo de documento del cliente no es válido.",
        );
    }

    const tipoDocumentoValidado =
        resultadoTipoDocumento.data;

    if (
        tipoDocumentoValidado === "CEDULA_NIC" &&
        !esCedulaNicaraguenseValida(
            numeroDocumentoFinal,
        )
    ) {
        throw new AppError(
            400,
            "La cédula nicaragüense debe contener 13 cifras y una letra final; puede escribirse con o sin guiones.",
        );
    }

    const numeroNormalizado =
        normalizarNumeroDocumento(
            tipoDocumentoValidado,
            numeroDocumentoFinal,
        );

    if (
        datos.persona.numberDocument !== undefined ||
        datos.persona.typeDocument !== undefined
    ) {
        datos.persona.numberDocument =
            numeroNormalizado;
    }

    const personaExistente =
        await clientesRepository.buscarPersonaPorDocumento(
            tipoDocumentoValidado,
            numeroNormalizado,
        );

    if (
        personaExistente &&
        personaExistente.id !== cliente.persona.id
    ) {
        throw new AppError(
            409,
            "Ya existe otra persona registrada con este documento de identidad.",
        );
    }
}

async function validarOrganizacionActualizada(
    cliente: ClienteEncontrado,
    datos: UpdateClienteInput,
) {
    if (datos.organizacion === undefined) {
        return;
    }

    if (!cliente.organizacion) {
        throw new AppError(
            409,
            "No puedes actualizar datos de organización en un cliente natural.",
        );
    }

    const ruc =
        datos.organizacion
            .identificacionTributaria;

    if (ruc === undefined) {
        return;
    }

    const organizacionExistente =
        await clientesRepository
            .buscarOrganizacionPorIdentificacionTributaria(
                ruc,
            );

    if (
        organizacionExistente &&
        organizacionExistente.id !==
            cliente.organizacion.id
    ) {
        throw new AppError(
            409,
            "El RUC ya está siendo utilizado por otra organización.",
        );
    }
}

export async function actualizarCliente(
    id: number,
    datos: UpdateClienteInput,
) {
    const cliente =
        await clientesRepository.buscarClientePorId(
            id,
        );

    if (!cliente) {
        throw new AppError(
            404,
            "Cliente no encontrado.",
        );
    }

    await validarCodigoActualizado(
        id,
        cliente.codigo,
        datos.codigo,
    );

    await validarPersonaActualizada(
        cliente,
        datos,
    );

    await validarOrganizacionActualizada(
        cliente,
        datos,
    );

    try {
        return await clientesRepository
            .actualizarCliente(
                id,
                datos,
            );
    } catch (error) {
        if (
            error instanceof
                Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            throw new AppError(
                409,
                "Los datos del cliente entran en conflicto con un registro existente.",
            );
        }

        throw error;
    }
}

export async function actualizarEstadoCliente(id: number, activo: boolean) {
    const cliente = await clientesRepository.buscarClientePorId(id);

    if (!cliente) {
        throw new AppError(404, "Cliente no encontrado.");
    }

    return clientesRepository.actualizarEstadoCliente(id, activo);
}
