import { z } from 'zod';

const identificador = z.string().regex(/^[1-9]\d*$/, 'El identificador debe ser positivo.')
    .transform(Number).pipe(z.number().int().max(2147483647));

export const ordenEquipoParamsSchema = z.strictObject({
    id: identificador,
});

export const diagnosticoParamsSchema = z.strictObject({
    id: identificador,
    registroId: identificador,
});

export const agregarEquipoOrdenSchema = z.strictObject({
    equipoId: z.number().int().positive().max(2147483647),
});

export const registrarDiagnosticoSchema = z.strictObject({
    diagnostico: z.string().trim().min(10).max(5000),
    observaciones: z.string().trim().max(5000).nullable().optional(),
    resultado: z.string().trim().max(5000).nullable().optional(),
});

export type RegistrarDiagnosticoInput = z.infer<typeof registrarDiagnosticoSchema>;
