import { z } from 'zod';
import { paginacionQueryShape } from '../../../shared/pagination.js';

export const areaCoberturaSchema = z.enum(['COMERCIAL', 'FINANCIERO', 'LOGISTICO', 'CALIDAD']);
const fecha = z.iso.datetime({ offset: true });
const texto = (max: number) => z.string().trim().min(1).max(max);
const id = z.coerce.number().int().positive().max(2_147_483_647);

export const coberturaParamsSchema = z.object({ area: areaCoberturaSchema });
export const coberturaInputSchema = z.object({
  version: z.number().int().min(0), desde: fecha, hastaVerificada: fecha,
  observacion: z.string().trim().max(1000).optional(),
}).strict();
export const historialQuerySchema = z.object({ ...paginacionQueryShape }).strict();

export const listarContratosSchema = z.object({
  q: z.string().trim().max(100).optional(), clienteId: id.optional(),
  ...paginacionQueryShape,
}).strict();
export const contratoIdSchema = z.object({ id }).strict();
export const crearContratoSchema = z.object({
  clienteId: id, referencia: texto(100), inicio: fecha, fin: fecha,
  importe: z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/),
  observacion: z.string().trim().max(1000).optional(),
}).strict();
export const terminarContratoSchema = z.object({
  version: z.number().int().min(1), terminadoEn: fecha, motivo: texto(1000),
}).strict();
export const renovarContratoSchema = z.object({
  version: z.number().int().min(1), referencia: texto(100), inicio: fecha, fin: fecha,
  importe: z.string().regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/),
  observacion: z.string().trim().max(1000).optional(),
}).strict();

export const historialIdSchema = z.object({ area: areaCoberturaSchema }).strict();
export const clienteParamsSchema = z.object({ clienteId: id }).strict();
