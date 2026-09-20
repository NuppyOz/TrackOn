import { z } from 'zod';
import { createPersonaSchema } from '../personas/personas.schema.js';

export const createEmpleadoSchema = z.strictObject({
    codEmpleado: z
        .string({ error: 'El código de empleado debe ser texto' })
        .trim()
        .min(1, { error: 'El código de empleado es obligatorio' })
        .max(30,  {
            error: 'El código de empleado no debe de superar 30 caracteres'
        })
        .toUpperCase(),

    persona: createPersonaSchema,
})

export const empleadoParamsSchema = z.strictObject({
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

export type CreateEmpleadoInput = z.infer<typeof createEmpleadoSchema>