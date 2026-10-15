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

const datoProvisional = z.string().trim().min(1).max(100).nullable();
const motivoNoVisible = z.string().trim().min(5).max(1000).nullable();
export const equipoProvisionalSchema = z.strictObject({
    descripcionProvisional: z.string().trim().min(10).max(2000),
    tipoRegistrado: z.string().trim().min(1).max(100),
    marcaRegistrada: datoProvisional,
    modeloRegistrado: datoProvisional,
    serieRegistrada: z.string().trim().min(1).max(150).nullable(),
    motivoMarcaNoVisible: motivoNoVisible,
    motivoModeloNoVisible: motivoNoVisible,
    motivoSerieNoVisible: motivoNoVisible,
}).superRefine((datos, contexto) => {
    for (const [campo, motivo] of [
        ['marcaRegistrada', 'motivoMarcaNoVisible'],
        ['modeloRegistrado', 'motivoModeloNoVisible'],
        ['serieRegistrada', 'motivoSerieNoVisible'],
    ] as const) {
        if (!datos[campo] && !datos[motivo]) contexto.addIssue({ code: 'custom', path: [motivo], message: 'Indica por qué este dato no es visible.' });
    }
});
export type EquipoProvisionalInput = z.infer<typeof equipoProvisionalSchema>;
