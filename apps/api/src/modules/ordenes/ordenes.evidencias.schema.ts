import { z } from 'zod';
export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const evidenciaSchema = z.strictObject({
    nombreOriginal: z.string().trim().min(1).max(255).refine(valor => !/[\x00-\x1f/\\]/.test(valor), 'El nombre de archivo contiene caracteres inválidos.'),
    tipoArchivo: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    tamanoBytes: z.number().int().positive().max(MAX_EVIDENCE_BYTES),
    hashArchivo: z.string().regex(/^[a-f0-9]{64}$/),
    reemplazaAId: z.number().int().positive().max(2147483647).optional(),
});
export const evidenciaParamsSchema = z.strictObject({
    id: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)),
    registroId: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)),
    evidenciaId: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)),
});
export const revisarEvidenciaSchema = z.strictObject({
    decision: z.enum(['ACEPTADA', 'RECHAZADA']),
    observacion: z.string().trim().max(2000).nullable().optional(),
}).refine(datos => datos.decision !== 'RECHAZADA' || (datos.observacion?.length ?? 0) >= 5,
    'Explica por qué se rechaza la evidencia.');
export type EvidenciaInput = z.infer<typeof evidenciaSchema>;

export function tipoRealArchivo(contenido: Buffer): EvidenciaInput['tipoArchivo'] | null {
    if (contenido.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (contenido[0] === 255 && contenido[1] === 216 && contenido[2] === 255) return 'image/jpeg';
    if (contenido.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (contenido.subarray(0, 4).toString() === 'RIFF' && contenido.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
}
