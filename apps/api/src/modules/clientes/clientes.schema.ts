import { z } from "zod";
import { correoOpcionalSchema, telefonoNicaraguenseSchema } from "../../shared/contacto.schema.js";

import { createPersonaSchema, updatePersonaSchema } from "../personas/personas.schema.js";
import { paginacionQueryShape } from "../../shared/pagination.js";

const codigoClienteSchema = z
    .string({
        error: "El código del cliente debe ser texto.",
    })
    .trim()
    .min(1, {
        error: "El código del cliente es obligatorio.",
    })
    .max(30, {
        error: "El código del cliente no debe superar 30 caracteres.",
    })
    .toUpperCase();

const telefonoComercialSchema = telefonoNicaraguenseSchema;

const correoComercialSchema = correoOpcionalSchema("El correo comercial");

const organizacionSchema = z.strictObject({
    razonSocial: z
        .string({
            error: "La razón social debe ser texto.",
        })
        .trim()
        .min(1, {
            error: "La razón social es obligatoria.",
        })
        .max(200, {
            error: "La razón social no debe superar 200 caracteres.",
        }),

    nombreComercial: z
        .string({
            error: "El nombre comercial debe ser texto.",
        })
        .trim()
        .min(1, {
            error: "El nombre comercial no puede estar vacío.",
        })
        .max(200, {
            error: "El nombre comercial no debe superar 200 caracteres.",
        })
        .nullish(),

    identificacionTributaria: z
        .string({
            error: "El RUC debe ser texto.",
        })
        .trim()
        .toUpperCase()
        .regex(/^J\d{13}$/, {
            error: "El RUC de una persona jurídica debe iniciar con J seguido de 13 dígitos.",
        }),
});

const updateOrganizacionSchema = z
    .strictObject({
        razonSocial: z
            .string({
                error: "La razón social debe ser texto.",
            })
            .trim()
            .min(1, {
                error: "La razón social no puede estar vacía.",
            })
            .max(200, {
                error: "La razón social no debe superar 200 caracteres.",
            })
            .optional(),

        nombreComercial: z
            .string({
                error: "El nombre comercial debe ser texto.",
            })
            .trim()
            .min(1, {
                error: "El nombre comercial no puede estar vacío.",
            })
            .max(200, {
                error: "El nombre comercial no debe superar 200 caracteres.",
            })
            .nullish(),

        identificacionTributaria: z
            .string({
                error: "El RUC debe ser texto.",
            })
            .trim()
            .toUpperCase()
            .regex(/^J\d{13}$/, {
                error: "El RUC de una persona jurídica debe iniciar con J seguido de 13 dígitos.",
            })
            .optional(),
    })
    .refine(datos => Object.values(datos).some(valor => valor !== undefined), {
        error: "Debes enviar al menos un dato de la organización para actualizar.",
    });

const camposComunesCliente = {
    codigo: codigoClienteSchema,

    telefonoComercial: telefonoComercialSchema,

    correoComercial: correoComercialSchema,
};

const clienteNaturalSchema = z.strictObject({
    ...camposComunesCliente,

    tipo: z.literal("NATURAL"),

    persona: createPersonaSchema,
});

const clienteEmpresaSchema = z.strictObject({
    ...camposComunesCliente,

    tipo: z.literal("EMPRESA"),

    organizacion: organizacionSchema,
});

export const createClienteSchema = z
    .discriminatedUnion("tipo", [clienteNaturalSchema, clienteEmpresaSchema])
    .superRefine((cliente, contexto) => {
        if (cliente.tipo !== "NATURAL") {
            return;
        }

        if (cliente.persona.typeDocument == null) {
            contexto.addIssue({
                code: "custom",
                path: ["persona", "typeDocument"],
                message: "El cliente natural debe tener un tipo de documento de identidad.",
            });
        }

        if (cliente.persona.numberDocument == null) {
            contexto.addIssue({
                code: "custom",
                path: ["persona", "numberDocument"],
                message: "El cliente natural debe tener un número de documento de identidad.",
            });
        }
    });

export const updateClienteSchema = z
    .strictObject({
        codigo: codigoClienteSchema.optional(),

        telefonoComercial: telefonoComercialSchema.optional(),

        correoComercial: correoComercialSchema.optional(),

        persona: updatePersonaSchema.optional(),

        organizacion: updateOrganizacionSchema.optional(),
    })
    .refine(datos => Object.values(datos).some(valor => valor !== undefined), {
        error: "Debes enviar al menos un dato del cliente para actualizar.",
    })
    .refine(datos => !(datos.persona !== undefined && datos.organizacion !== undefined), {
        error: "No puedes actualizar datos de persona y organización en la misma operación.",
    });

export const clienteParamsSchema = z.strictObject({
    id: z
        .string()
        .regex(/^[1-9]\d*$/, {
            error: "El ID debe ser un número entero positivo.",
        })
        .transform(Number)
        .pipe(
            z.number().int().max(2147483647, {
                error: "El ID supera el valor máximo permitido.",
            }),
        ),
});

export const updateEstadoClienteSchema = z.strictObject({
    activo: z.boolean({
        error: "El estado del cliente debe ser verdadero o falso.",
    }),
});

export const listarClientesQuerySchema = z.strictObject({
    buscar: z.string().trim().max(200).optional(),
    tipo: z.enum(["NATURAL", "EMPRESA"]).optional(),
    estado: z.enum(["activos", "inactivos", "todos"]).default("todos"),
    ...paginacionQueryShape,
});

export type ListarClientesInput = z.infer<typeof listarClientesQuerySchema>;

export type CreateClienteInput = z.infer<typeof createClienteSchema>;

export type UpdateEstadoClienteInput = z.infer<typeof updateEstadoClienteSchema>;

export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
