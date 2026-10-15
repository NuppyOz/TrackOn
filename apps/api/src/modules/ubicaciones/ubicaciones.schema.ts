import { z } from "zod";
import { paginacionQueryShape } from "../../shared/pagination.js";

const idTextoSchema = z
    .string()
    .regex(/^[1-9]\d*$/, {
        error: "El ID debe ser un número entero positivo.",
    })
    .transform(Number)
    .pipe(z.number().int().max(2147483647));

const idNumeroSchema = z
    .number({
        error: "El ID debe ser un número.",
    })
    .int()
    .positive()
    .max(2147483647);

function textoRequerido(campo: string, maximo: number) {
    return z
        .string({
            error: `${campo} debe ser texto.`,
        })
        .trim()
        .min(1, {
            error: `${campo} es obligatorio.`,
        })
        .max(maximo, {
            error: `${campo} no debe superar ${maximo} caracteres.`,
        });
}

function textoOpcional(campo: string, maximo: number) {
    return z
        .string({
            error: `${campo} debe ser texto.`,
        })
        .trim()
        .max(maximo, {
            error: `${campo} no debe superar ${maximo} caracteres.`,
        })
        .transform(valor => valor || null)
        .nullable()
        .optional();
}

const camposUbicacion = {
    nombre: textoRequerido("El nombre", 150),
    direccion: textoRequerido("La dirección", 2000),
    referencia: textoOpcional("La referencia", 2000),
    contactoNombre: textoOpcional("El nombre del contacto", 200),
    contactoTelefono: textoOpcional("El teléfono del contacto", 25),
};

export const ubicacionParamsSchema = z.strictObject({
    id: idTextoSchema,
});

export const createUbicacionSchema = z.strictObject({
    clienteId: idNumeroSchema,
    ...camposUbicacion,
});

export const updateUbicacionSchema = z
    .strictObject({
        nombre: camposUbicacion.nombre.optional(),
        direccion: camposUbicacion.direccion.optional(),
        referencia: camposUbicacion.referencia,
        contactoNombre: camposUbicacion.contactoNombre,
        contactoTelefono: camposUbicacion.contactoTelefono,
    })
    .refine(datos => Object.values(datos).some(valor => valor !== undefined), {
        error: "Debes enviar al menos un dato de la ubicación para actualizar.",
    });

export const updateEstadoUbicacionSchema = z.strictObject({
    activa: z.boolean({
        error: "El estado debe ser verdadero o falso.",
    }),
});

export const listarUbicacionesQuerySchema = z.strictObject({
    clienteId: z.preprocess(valor => (valor === "" ? undefined : valor), idTextoSchema.optional()),

    estado: z.enum(["todos", "activos", "inactivos"]).default("activos"),

    nombre: z.preprocess(valor => (valor === "" ? undefined : valor), z.string().trim().max(150).optional()),

    ...paginacionQueryShape,
});

export type CreateUbicacionInput = z.infer<typeof createUbicacionSchema>;

export type UpdateUbicacionInput = z.infer<typeof updateUbicacionSchema>;

export type ListarUbicacionesInput = z.infer<typeof listarUbicacionesQuerySchema>;
