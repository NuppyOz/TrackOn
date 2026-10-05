import { z } from 'zod';
import { paginacionQueryShape } from '../../shared/pagination.js';

const codigoSchema = z.string({ error: 'El código debe ser texto.' })
    .trim().min(1, { error: 'El código es obligatorio.' }).max(30).toUpperCase();
const nombreSchema = z.string({ error: 'El nombre debe ser texto.' })
    .trim().min(1, { error: 'El nombre es obligatorio.' }).max(150);
const descripcionSchema = z.string().trim()
    .transform((valor) => valor || null).nullable().optional();

export const servicioParamsSchema = z.strictObject({
    id: z.string().regex(/^[1-9]\d*$/, { error: 'El ID debe ser un entero positivo.' })
        .transform(Number).pipe(z.number().int().max(2147483647)),
});

export const createServicioSchema = z.strictObject({
    codigo: codigoSchema,
    nombre: nombreSchema,
    descripcion: descripcionSchema,
    activo: z.boolean().optional(),
});

export const updateServicioSchema = z.strictObject({
    codigo: codigoSchema.optional(),
    nombre: nombreSchema.optional(),
    descripcion: descripcionSchema,
}).refine((datos) => Object.keys(datos).length > 0, {
    error: 'Debes enviar al menos un dato para actualizar el servicio.',
});

export const updateEstadoServicioSchema = z.strictObject({
    activo: z.boolean({ error: 'El estado debe ser verdadero o falso.' }),
});

export const listarServiciosQuerySchema = z.strictObject({
    estado: z.enum(['todos', 'activos', 'inactivos']).default('todos'),
    buscar: z.preprocess((valor) => valor === '' ? undefined : valor, z.string().trim().max(150).optional()),
    ...paginacionQueryShape,
});

export type CreateServicioInput = z.infer<typeof createServicioSchema>;
export type UpdateServicioInput = z.infer<typeof updateServicioSchema>;
export type ServicioFilters = z.infer<typeof listarServiciosQuerySchema>;
