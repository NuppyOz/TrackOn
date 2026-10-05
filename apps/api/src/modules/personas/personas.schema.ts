import { z } from "zod";

function textObligatorio(etiqueta: string, maximo: number) {
    return z
        .string({
            error: `${etiqueta} debe ser texto`,
        })
        .trim()
        .min(1, {
            error: `${etiqueta} no puede estar vacío.`,
        })
        .max(maximo, {
            error: `${etiqueta} no debe superar ${maximo} caracteres.`,
        });
}

export const tiposDocumentoPersona = ["CEDULA_NIC", "CEDULA_RESIDENCIA", "PASAPORTE"] as const;

export const tipoDocumentoPersonaSchema = z.enum(tiposDocumentoPersona, {
    error: "El tipo de documento no es válido.",
});

export type TipoDocumentoPersona = (typeof tiposDocumentoPersona)[number];

export function normalizarCedulaNicaraguense(numero: string) {
    return numero.trim().replace(/[\s-]/g, "").toUpperCase();
}

export function normalizarNumeroDocumento(tipo: TipoDocumentoPersona, numero: string) {
    if (tipo === "CEDULA_NIC") {
        return normalizarCedulaNicaraguense(numero);
    }

    return numero.trim().toUpperCase();
}

export function esCedulaNicaraguenseValida(numero: string) {
    const normalizada = normalizarCedulaNicaraguense(numero);

    return /^\d{13}[A-Z]$/.test(normalizada);
}

const firstNameSchema = textObligatorio("El primer nombre", 100);

const secondNameSchema = textObligatorio("El segundo nombre", 100).nullish();

const firstLastNameSchema = textObligatorio("El primer apellido", 100);

const secondLastNameSchema = textObligatorio("El segundo apellido", 100).nullish();

const typeDocumentSchema = tipoDocumentoPersonaSchema.nullish();

const numberDocumentSchema = textObligatorio("El número de documento", 50).nullish();

const telephoneSchema = textObligatorio("El teléfono", 25).nullish();

const correoSchema = textObligatorio("El correo", 254)
    .pipe(
        z.email({
            error: "El correo no tiene un formato válido.",
        }),
    )
    .nullish();

export const createPersonaSchema = z
    .strictObject({
        firstName: firstNameSchema,

        secondName: secondNameSchema,

        firstLastName: firstLastNameSchema,

        secondLastName: secondLastNameSchema,

        typeDocument: typeDocumentSchema,

        numberDocument: numberDocumentSchema,

        telephone: telephoneSchema,

        correo: correoSchema,
    })
    .superRefine((persona, contexto) => {
        const tieneTipo = persona.typeDocument != null;

        const tieneNumero = persona.numberDocument != null;

        if (tieneTipo && !tieneNumero) {
            contexto.addIssue({
                code: "custom",
                path: ["numberDocument"],
                message: "Debes indicar el número del documento.",
            });
        }

        if (tieneNumero && !tieneTipo) {
            contexto.addIssue({
                code: "custom",
                path: ["typeDocument"],
                message: "Debes indicar el tipo del documento.",
            });
        }

        if (
            persona.typeDocument === "CEDULA_NIC" &&
            persona.numberDocument &&
            !esCedulaNicaraguenseValida(persona.numberDocument)
        ) {
            contexto.addIssue({
                code: "custom",
                path: ["numberDocument"],
                message:
                    "La cédula nicaragüense debe contener 13 cifras y una letra final; puede escribirse con o sin guiones.",
            });
        }
    })
    .transform(persona => ({
        ...persona,

        numberDocument:
            persona.typeDocument && persona.numberDocument
                ? normalizarNumeroDocumento(persona.typeDocument, persona.numberDocument)
                : persona.numberDocument,
    }));

export const updatePersonaSchema = z
    .strictObject({
        firstName: firstNameSchema.optional(),

        secondName: secondNameSchema.optional(),

        firstLastName: firstLastNameSchema.optional(),

        secondLastName: secondLastNameSchema.optional(),

        typeDocument: typeDocumentSchema.optional(),

        numberDocument: numberDocumentSchema.optional(),

        telephone: telephoneSchema.optional(),

        correo: correoSchema.optional(),
    })
    .refine(datos => Object.values(datos).some(valor => valor !== undefined), {
        error: "Debes enviar al menos un dato de la persona para actualizar.",
    });

export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
