import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100);
const dinero = z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/);
const texto = (max: number) => z.string().trim().min(1).max(max);
export const categoriasCosto = ['MANO_OBRA', 'MATERIAL', 'TRANSPORTE', 'OTRO'] as const;

export const listarCostosSchema = z.object({ q: z.string().trim().max(100).optional(), clienteId: id.optional(), ...paginacionQueryShape }).strict();
export const costoIdSchema = z.object({ id }).strict();
export const crearCostoSchema = z.object({
  referencia, fechaEfectiva: fecha, categoria: z.enum(categoriasCosto), importe: dinero,
  clienteId: id.optional(), ordenId: id.optional(), comprobanteId: id.optional(), observacion: z.string().trim().max(1000).optional(),
}).strict();
export const revertirCostoSchema = z.object({ version: z.number().int().min(1).max(2_147_483_647), fechaEfectiva: fecha, motivo: texto(1000) }).strict();
export type ListarCostos = z.infer<typeof listarCostosSchema>;
export type CrearCosto = z.infer<typeof crearCostoSchema>;
export type RevertirCosto = z.infer<typeof revertirCostoSchema>;
