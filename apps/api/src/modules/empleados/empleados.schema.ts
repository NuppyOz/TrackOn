import { z } from 'zod';
import { createPersonaSchema, updatePersonaSchema } from '../personas/personas.schema.js';
import { paginacionQueryShape } from '../../shared/pagination.js';

export const listarEmpleadosSchema = z.strictObject({
    ...paginacionQueryShape,
    buscar: z.string().trim().max(150).default(''),
    estado: z.enum(['todos', 'activos', 'inactivos']).default('todos'),
    tecnico: z.enum(['todos', 'habilitados', 'no-habilitados']).default('todos'),
});

export type ListarEmpleadosInput = z.infer<typeof listarEmpleadosSchema>;

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

export const updateEmpleadoSchema = z
    .strictObject({
        codEmpleado:
            createEmpleadoSchema.shape.codEmpleado.optional(),

        persona: updatePersonaSchema.optional(),
    })
    .refine(
        (datos) =>
            Object.values(datos).some((valor) => valor !== undefined),
        {
            error: 'Debes enviar al menos un dato del empleado para actualizar.',
        },
    );


export const updateEstadoEmpleadoSchema = z
    .strictObject({
        active: z.boolean({
            error: 'El estado del empleado debe ser verdadero o falso.',
        }),
    });


export const updateHabilitacionTecnicaSchema = z
    .strictObject({
        habilitadoComoTecnico: z.boolean({
            error: 'La habilitación técnica debe de ser verdadera o falsa.'
        }),
    });


export type UpdateHabilitacionTecnicaInput = z.infer<typeof updateHabilitacionTecnicaSchema>
export type UpdateEstadoEmpleadoInput = z.infer<typeof updateEstadoEmpleadoSchema>
export type UpdateEmpleadoInput = z.infer<typeof updateEmpleadoSchema>;
export type CreateEmpleadoInput = z.infer<typeof createEmpleadoSchema>
