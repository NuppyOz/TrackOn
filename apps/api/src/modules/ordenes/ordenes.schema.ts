import { z } from 'zod';
import { paginacionQueryShape } from '../../shared/pagination.js';

export const estadoOrdenSchema = z.enum([
    'BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION',
    'EN_REVISION', 'CERRADA', 'CANCELADA',
]);

const idSchema = z.string()
    .regex(/^[1-9]\d*$/, 'El ID debe ser un entero positivo.')
    .transform(Number)
    .pipe(z.number().int().max(2147483647));

export const ordenParamsSchema = z.strictObject({ id: idSchema });

export const crearOrdenSchema = z.strictObject({
    ubicacionId: z.number().int().positive(),
    solicitud: z.string().trim().min(5).max(5000),
    prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
    fechaProgramada: z.iso.datetime({ offset: true }).nullable().optional(),
});

export const listarOrdenesSchema = z.strictObject({
    estado: estadoOrdenSchema.optional(),
    buscar: z.string().trim().max(150).optional(),
    ...paginacionQueryShape,
});

export const cambiarEstadoOrdenSchema = z.strictObject({
    estado: estadoOrdenSchema,
    motivo: z.string().trim().min(3).max(1000),
});

export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;
export type ListarOrdenesInput = z.infer<typeof listarOrdenesSchema>;
export type CambiarEstadoOrdenInput = z.infer<typeof cambiarEstadoOrdenSchema>;
export type EstadoOrdenCodigo = z.infer<typeof estadoOrdenSchema>;
