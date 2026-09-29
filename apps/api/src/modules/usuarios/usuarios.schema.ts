// Validación de entradas con Zod.
import { z } from 'zod';

const intIdSchema = z
    .number({ error: 'El ID debe ser un número.'})
    .int({ error: 'El ID debe ser un número entero.'})
    .positive({ error: 'El ID debe ser mayor que cero.'})
    .max(2147483647, { error: 'El ID supera el valor máximo permitido.'});

const identificadorSchema = z
    .string({ error: 'El identificador debe ser texto.'})
    .trim()
    .min(3, { error: 'El identificador debe tener al menos 3 caracteres.'})
    .max(100, { error: 'El identificador no debe superar 100 caracteres.'})
    .toLowerCase();

export const createUsuarioSchema = z.strictObject({
    empleadoId: intIdSchema,

    rolId: intIdSchema,

    identificador: identificadorSchema,

    password: z
        .string({
            error: 'La contraseña debe ser texto.',
        })
        .min(12, {
            error: 'La contraseña debe tener al menos 12 caracteres.',
        })
        .max(128, {
            error: 'La contraseña no debe superar 128 caracteres.',
        }),
});

export const usuarioParamsSchema = z.strictObject({
    id: z
        .string()
        .regex(/^[1-9]\d*$/, {
            error: 'El ID debe ser un número entero positivo.',
        })
        .transform(Number)
        .pipe(
            z.number().int().max(2147483647, {
                error: 'El ID supera el valor máximo permitido.',
            }),
        ),
});

export const updateUsuarioSchema = z
    .strictObject({
        identificador: identificadorSchema.optional(),

        rolId: intIdSchema.optional(),
    })
    .refine(
        (datos) =>
            Object.values(datos).some(
                (valor) => valor !== undefined,
            ),
        {
            error: 'Debes enviar al menos un dato del usuario para actualizar.',
        },
    );

export const updateEstadoUsuarioSchema = z.strictObject({
    activo: z.boolean({
        error: 'El estado del usuario debe ser verdadero o falso.',
    }),
});

export type CreateUsuarioInput =
    z.infer<typeof createUsuarioSchema>;

export type UpdateUsuarioInput =
    z.infer<typeof updateUsuarioSchema>;