import { z } from 'zod';
import { paginacionQueryShape } from '../../shared/pagination.js';

const codigoSchema = z.string({ error: 'El código debe ser texto.' })
    .trim().min(1, { error: 'El código es obligatorio.' }).max(30).toUpperCase();
const nombreSchema = z.string({ error: 'El nombre debe ser texto.' })
    .trim().min(1, { error: 'El nombre es obligatorio.' }).max(150);
const unidadMedidaSchema = z.string().trim().min(1, 'La unidad de medida es obligatoria.').max(30);

export const materialParamsSchema = z.strictObject({
    id: z.string().regex(/^[1-9]\d*$/, { error: 'El ID debe ser un entero positivo.' })
        .transform(Number).pipe(z.number().int().max(2147483647)),
});

export const createMaterialSchema = z.strictObject({
    codigo: codigoSchema,
    nombre: nombreSchema,
    unidadMedida: unidadMedidaSchema,
    activo: z.boolean().optional(),
});

export const updateMaterialSchema = z.strictObject({
    codigo: codigoSchema.optional(),
    nombre: nombreSchema.optional(),
    unidadMedida: unidadMedidaSchema.optional(),
}).refine((datos) => Object.keys(datos).length > 0, {
    error: 'Debes enviar al menos un dato para actualizar el material.',
});

export const updateEstadoMaterialSchema = z.strictObject({
    activo: z.boolean({ error: 'El estado debe ser verdadero o falso.' }),
});

export const listarMaterialesQuerySchema = z.strictObject({
    estado: z.enum(['todos', 'activos', 'inactivos']).default('todos'),
    buscar: z.preprocess((valor) => valor === '' ? undefined : valor, z.string().trim().max(150).optional()),
    ...paginacionQueryShape,
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MaterialFilters = z.infer<typeof listarMaterialesQuerySchema>;
