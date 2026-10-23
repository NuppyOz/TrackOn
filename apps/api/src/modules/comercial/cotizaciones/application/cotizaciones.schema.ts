import { z } from 'zod';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const version = z.number().int().min(1).max(2_147_483_647);
const fecha = z.string().datetime({ offset: true });
const decimal2 = z.string().max(20).regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);
const cantidad3 = z.string().max(13).regex(/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/).refine(v => Number(v) > 0);
const textoPlano = (max: number, min = 0) => z.string().trim().min(min).max(max).refine(v => !/<[^>]*>/.test(v), 'No se permite HTML.');

export const idParamsSchema = z.object({ id });
export const crearCotizacionSchema = z.strictObject({
  clienteId: id, contactoId: id.optional(), venceEn: fecha,
  lineas: z.array(z.strictObject({ conceptoId: id, cantidad: cantidad3, descuento: decimal2 })).max(100).default([]),
  nota: textoPlano(2000).optional(),
});
export const actualizarCotizacionSchema = z.strictObject({
  version, contactoId: id.nullable().optional(), venceEn: fecha.optional(),
  lineas: z.array(z.strictObject({ conceptoId: id, cantidad: cantidad3, descuento: decimal2 })).max(100).optional(),
  nota: textoPlano(2000).nullable().optional(),
}).refine(v => Object.keys(v).some(k => k !== 'version'), 'Indica al menos un campo para actualizar.');
export const enviarCotizacionSchema = z.strictObject({ version });
export const decisionCotizacionSchema = z.strictObject({ version, decision: z.enum(['APROBADA', 'RECHAZADA']), comentario: textoPlano(1000).optional() });
export const notaCotizacionSchema = z.strictObject({ texto: textoPlano(2000, 1) });
export const listarCotizacionesSchema = z.strictObject({
  q: z.string().trim().max(100).optional(), clienteId: id.optional(),
  estado: z.enum(['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA']).optional(),
  pagina: z.coerce.number().int().min(1).max(1_000_000).default(1), limite: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['id', 'creadaEn', 'venceEn']).default('creadaEn'), sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type CrearCotizacionInput = z.infer<typeof crearCotizacionSchema>;
export type ActualizarCotizacionInput = z.infer<typeof actualizarCotizacionSchema>;
export type ListarCotizacionesInput = z.infer<typeof listarCotizacionesSchema>;
