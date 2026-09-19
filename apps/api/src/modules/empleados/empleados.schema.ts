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

export type CreateEmpleadoInput = z.infer<typeof createEmpleadoSchema>