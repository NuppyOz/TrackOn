import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100);
const dinero = z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/);
const texto = (max: number) => z.string().trim().min(1).max(max);

export const listarCobrosSchema = z.object({ q: z.string().trim().max(100).optional(), clienteId: id.optional(), ...paginacionQueryShape }).strict();
export const cobroIdSchema = z.object({ id }).strict();
export const crearCobroSchema = z.object({
  clienteId: id, referencia, fechaEfectiva: fecha,
  aplicaciones: z.array(z.object({ comprobanteId: id, importe: dinero }).strict()).min(1).max(100),
  observacion: z.string().trim().max(1000).optional(),
}).strict();
export const revertirCobroSchema = z.object({ version: z.number().int().min(1).max(2_147_483_647), fechaEfectiva: fecha, motivo: texto(1000) }).strict();
export type ListarCobros = z.infer<typeof listarCobrosSchema>;
export type CrearCobro = z.infer<typeof crearCobroSchema>;
export type RevertirCobro = z.infer<typeof revertirCobroSchema>;
