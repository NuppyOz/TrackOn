import { z } from 'zod';

const MAX_ID = 2_147_483_647;
export const historialParamsSchema = z.object({ clienteId: z.coerce.number().int().min(1).max(MAX_ID) }).strict();
export const historialQuerySchema = z.object({
    pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).optional(),
    tipo: z.enum(['NOTA', 'COTIZACION', 'VENTA']).optional(),
}).strict();

export type HistorialQuery = z.infer<typeof historialQuerySchema>;
