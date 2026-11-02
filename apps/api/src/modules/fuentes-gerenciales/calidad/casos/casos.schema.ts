import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const idPositivo = z.coerce.number().int().min(1).max(2_147_483_647);
const idBody = z.number().int().min(1).max(2_147_483_647);
const fechaIso = z.iso.datetime({ offset: true });
const versionIncrementable = z.number().int().min(1).max(2_147_483_646);
const codigo = (max: number) => z.string().trim().toUpperCase().min(1).max(max);
export const estadosCaso = ['ABIERTO', 'EN_ATENCION', 'RESUELTO', 'CERRADO'] as const;

export const casoIdParamsSchema = z.object({ id: idPositivo }).strict();
export const listarCasosSchema = z.object({
  q: z.string().trim().toUpperCase().max(100).optional(),
  clienteId: idPositivo.optional(),
  activoReferencia: codigo(100).optional(),
  codigoFalla: codigo(60).optional(),
  abiertaAntes: fechaIso.optional(),
  estado: z.enum(estadosCaso).optional(),
  ...paginacionQueryShape,
}).strict();

export const crearCasoSchema = z.object({
  referencia: codigo(100),
  clienteId: idBody,
  activoReferencia: codigo(100),
  codigoFalla: codigo(60),
  descripcion: z.string().trim().min(1).max(2000),
  equipoId: idBody.optional(),
  ordenId: idBody.optional(),
  garantiaId: idBody.optional(),
  anteriorId: idBody.optional(),
  abiertaEn: fechaIso,
  respuestaLimiteEn: fechaIso.optional(),
  resolucionLimiteEn: fechaIso.optional(),
}).strict().superRefine((value, ctx) => {
  const apertura = Date.parse(value.abiertaEn);
  if (value.respuestaLimiteEn && Date.parse(value.respuestaLimiteEn) < apertura) ctx.addIssue({ code: 'custom', path: ['respuestaLimiteEn'], message: 'El plazo de respuesta debe ser igual o posterior a la apertura.' });
  if (value.resolucionLimiteEn && Date.parse(value.resolucionLimiteEn) < apertura) ctx.addIssue({ code: 'custom', path: ['resolucionLimiteEn'], message: 'El plazo de resolución debe ser igual o posterior a la apertura.' });
  if (value.respuestaLimiteEn && value.resolucionLimiteEn && Date.parse(value.respuestaLimiteEn) > Date.parse(value.resolucionLimiteEn)) ctx.addIssue({ code: 'custom', path: ['resolucionLimiteEn'], message: 'El plazo de resolución debe ser igual o posterior al de respuesta.' });
});

export const responderCasoSchema = z.object({ version: versionIncrementable, respondidaEn: fechaIso }).strict();
export const resolverCasoSchema = z.object({
  version: versionIncrementable, resueltaEn: fechaIso,
  resultado: z.enum(['PROCEDE', 'NO_PROCEDE']), causaRaiz: z.string().trim().min(1).max(2000),
}).strict();
export const cerrarCasoSchema = z.object({ version: versionIncrementable, cerradaEn: fechaIso }).strict();
export const crearRetrabajoSchema = z.object({
  referenciaTrabajo: codigo(100), fechaEfectiva: fechaIso, motivo: z.string().trim().min(1).max(2000), ordenId: idBody.optional(),
}).strict();
export const crearCorrectivaSchema = z.object({
  descripcion: z.string().trim().min(1).max(2000), responsableId: idBody,
  creadaEn: fechaIso, venceEn: fechaIso,
}).strict().superRefine((value, ctx) => {
  if (Date.parse(value.venceEn) < Date.parse(value.creadaEn)) ctx.addIssue({ code: 'custom', path: ['venceEn'], message: 'La fecha límite debe ser igual o posterior a la creación.' });
});
export const cerrarCorrectivaSchema = z.object({ version: versionIncrementable, cerradaEn: fechaIso, resultado: z.string().trim().min(1).max(2000) }).strict();

export type CrearCasoInput = z.infer<typeof crearCasoSchema>;
export type ListarCasosInput = z.infer<typeof listarCasosSchema>;
export type ResponderCasoInput = z.infer<typeof responderCasoSchema>;
export type ResolverCasoInput = z.infer<typeof resolverCasoSchema>;
export type CerrarCasoInput = z.infer<typeof cerrarCasoSchema>;
export type CrearRetrabajoInput = z.infer<typeof crearRetrabajoSchema>;
export type CrearCorrectivaInput = z.infer<typeof crearCorrectivaSchema>;
