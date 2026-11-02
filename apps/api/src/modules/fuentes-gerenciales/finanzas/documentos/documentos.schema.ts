import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100);
const dinero = z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/);
const texto = (max: number) => z.string().trim().min(1).max(max);

export const listarComprobantesSchema = z.object({ q: z.string().trim().max(100).optional(), clienteId: id.optional(), ...paginacionQueryShape }).strict();
export const comprobanteIdSchema = z.object({ id }).strict();
export const crearComprobanteSchema = z.object({
  clienteId: id, referencia, emisor: referencia, emitidaEn: fecha, venceEn: fecha,
  importeFinal: dinero,
  lineas: z.array(z.object({ descripcion: texto(200), importe: dinero, ordenId: id.optional(), conceptoId: id.optional() }).strict()).min(1).max(100),
  observacion: z.string().trim().max(1000).optional(),
}).strict();
export const anularComprobanteSchema = z.object({ version: z.number().int().min(1).max(2_147_483_647), fechaEfectiva: fecha, motivo: texto(1000) }).strict();

export type ListarComprobantes = z.infer<typeof listarComprobantesSchema>;
export type CrearComprobante = z.infer<typeof crearComprobanteSchema>;
export type AnularComprobante = z.infer<typeof anularComprobanteSchema>;
