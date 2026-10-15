import { z } from 'zod';

// Decimal(12,3): se admiten hasta nueve dígitos enteros y tres decimales.
export const cantidadTrabajoSchema = z.number().positive().max(999999999.999)
    .refine(valor => Math.abs(valor * 1000 - Math.round(valor * 1000)) < 0.0001,
        'La cantidad admite hasta tres decimales.');

export const registrarServicioOrdenSchema = z.strictObject({
    servicioId: z.number().int().positive().max(2147483647),
    cantidad: cantidadTrabajoSchema,
    descripcionTrabajo: z.string().trim().min(5).max(5000),
});
export const registrarMaterialOrdenSchema = z.strictObject({
    materialId: z.number().int().positive().max(2147483647),
    cantidad: cantidadTrabajoSchema,
    observacion: z.string().trim().max(5000).nullable().optional(),
});
export type ServicioOrdenInput = z.infer<typeof registrarServicioOrdenSchema>;
export type MaterialOrdenInput = z.infer<typeof registrarMaterialOrdenSchema>;
