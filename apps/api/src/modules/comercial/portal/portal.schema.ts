import { z } from 'zod';

const password = z.string().min(12).max(128);
export const identificadorPortal = z.string().trim().toLowerCase().min(3).max(100).regex(/^[a-z0-9._-]+$/);
export const crearCuentaPortalSchema = z.strictObject({ identificador: identificadorPortal, password });
const version = z.number().int().min(1).max(2_147_483_647);
export const actualizarCuentaPortalSchema = z.strictObject({ version, activo: z.boolean() });
export const restablecerCuentaPortalSchema = z.strictObject({ version, password });
export const loginPortalSchema = z.strictObject({ identificador: identificadorPortal, password: z.string().min(1).max(128) });
export const decisionPortalSchema = z.strictObject({ version, decision: z.enum(['APROBADA', 'RECHAZADA']), comentario: z.string().trim().max(1000).refine(v => !/<[^>]*>/.test(v)).optional() });
export const listadoPortalSchema = z.strictObject({
  pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
  estado: z.enum(['ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA']).optional(),
});
export const portalIdSchema = z.object({ id: z.coerce.number().int().min(1).max(2_147_483_647) });
