import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const idPositivo = z.coerce.number().int().min(1).max(2_147_483_647);
const fechaIso = z.iso.datetime({ offset: true });
const codigo = (max: number) => z.string().trim().toUpperCase().min(1).max(max);

export const garantiaIdParamsSchema = z.object({ id: idPositivo }).strict();
export const listarGarantiasSchema = z.object({
  q: z.string().trim().toUpperCase().max(100).optional(),
  clienteId: idPositivo.optional(),
  activoReferencia: codigo(100).optional(),
  ...paginacionQueryShape,
}).strict();

export const crearGarantiaSchema = z.object({
  referencia: codigo(100),
  clienteId: z.number().int().min(1).max(2_147_483_647),
  tipo: z.enum(['SERVICIO', 'EQUIPO', 'REPUESTO', 'COMPONENTE']),
  activoReferencia: codigo(100),
  equipoId: z.number().int().min(1).max(2_147_483_647).optional(),
  ordenId: z.number().int().min(1).max(2_147_483_647).optional(),
  inicio: fechaIso,
  fin: fechaIso,
  cobertura: z.string().trim().min(1).max(2000),
  exclusiones: z.string().trim().max(2000).optional(),
}).strict().superRefine((value, ctx) => {
  if (Date.parse(value.inicio) >= Date.parse(value.fin)) ctx.addIssue({ code: 'custom', path: ['fin'], message: 'fin debe ser posterior a inicio.' });
});

export type CrearGarantiaInput = z.infer<typeof crearGarantiaSchema>;
export type ListarGarantiasInput = z.infer<typeof listarGarantiasSchema>;
