import { z } from 'zod';

const MAX_ID = 2_147_483_647;
const id = z.coerce.number().int().min(1).max(MAX_ID);

export const convertirVentaParamsSchema = z.object({ id }).strict();
export const convertirVentaBodySchema = z.object({ version: z.number().int().min(1).max(MAX_ID) }).strict();

export const listarVentasQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    clienteId: id.optional(),
    pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.enum(['id', 'confirmadaEn']).default('confirmadaEn'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export type ListarVentas = z.infer<typeof listarVentasQuerySchema>;
