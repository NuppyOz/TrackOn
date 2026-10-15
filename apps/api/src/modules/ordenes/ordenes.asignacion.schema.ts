import { z } from 'zod';

export const asignarOrdenSchema = z.strictObject({
    cuadrillaId: z.number().int().positive(),
    motivo: z.string().trim().min(3).max(1000),
    fechaProgramada: z.iso.datetime({ offset: true }).optional(),
});

export type AsignarOrdenInput = z.infer<typeof asignarOrdenSchema>;
