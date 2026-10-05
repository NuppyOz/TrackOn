import { z } from 'zod';
import { paginacionQueryShape } from '../../shared/pagination.js';

const idSchema = z.string().regex(/^[1-9]\d*$/, { error: 'El ID debe ser un número entero positivo.' })
    .transform(Number).pipe(z.number().int().max(2147483647));

export const cuadrillaParamsSchema = z.strictObject({ id: idSchema });
export const miembroParamsSchema = z.strictObject({ id: idSchema, miembroId: idSchema });

const nombreSchema = z.string({ error: 'El nombre debe ser texto.' }).trim()
    .min(1, { error: 'El nombre de la cuadrilla es obligatorio.' }).max(100);

export const createCuadrillaSchema = z.strictObject({
    nombre: nombreSchema,
    activa: z.boolean().optional(),
});

export const updateCuadrillaSchema = z.strictObject({ nombre: nombreSchema.optional() })
    .refine((datos) => Object.keys(datos).length > 0, { error: 'Debes enviar al menos un dato para actualizar la cuadrilla.' });

export const updateEstadoCuadrillaSchema = z.strictObject({
    activa: z.boolean({ error: 'El estado debe ser verdadero o falso.' }),
});

export const agregarMiembroSchema = z.strictObject({
    empleadoId: z.number().int().positive({ error: 'El empleado es obligatorio.' }),
});

export const definirLiderSchema = z.strictObject({
    empleadoId: z.number().int().positive({ error: 'El empleado es obligatorio.' }),
});

export const listarCuadrillasQuerySchema = z.strictObject({
    estado: z.enum(['todos', 'activas', 'inactivas']).default('activas'),
    nombre: z.preprocess((valor) => valor === '' ? undefined : valor, z.string().trim().max(100).optional()),
    ...paginacionQueryShape,
});

export type CreateCuadrillaInput = z.infer<typeof createCuadrillaSchema>;
export type UpdateCuadrillaInput = z.infer<typeof updateCuadrillaSchema>;
export type CuadrillaFilters = z.infer<typeof listarCuadrillasQuerySchema>;
