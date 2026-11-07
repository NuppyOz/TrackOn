import { z } from 'zod';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const version = z.number().int().min(1).max(2_147_483_647);
const texto = (max: number, min = 0) => z.string().trim().min(min).max(max).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const valor = z.string().max(20).regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/);
const actividad = z.string().datetime({ offset: true });

export const oportunidadParamsSchema = z.strictObject({ id });
export const listarOportunidadesSchema = z.strictObject({
  clienteId: id.optional(),
  etapa: z.enum(['NUEVA', 'CALIFICADA', 'PROPUESTA', 'GANADA', 'PERDIDA']).optional(),
  q: z.string().trim().max(100).optional(),
  pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(10),
});
export const crearOportunidadSchema = z.strictObject({
  clienteId: id,
  nombre: texto(150, 1),
  valorEstimado: valor.optional(),
  proximaActividad: actividad.optional(),
  nota: texto(1000).optional(),
});
export const actualizarOportunidadSchema = z.strictObject({
  version,
  nombre: texto(150, 1).optional(),
  etapa: z.enum(['CALIFICADA', 'PROPUESTA', 'PERDIDA']).optional(),
  valorEstimado: valor.nullable().optional(),
  proximaActividad: actividad.nullable().optional(),
  nota: texto(1000).nullable().optional(),
}).refine(value => Object.keys(value).some(key => key !== 'version'), 'Indica al menos un campo para actualizar.');

export type CrearOportunidad = z.infer<typeof crearOportunidadSchema>;
export type ActualizarOportunidad = z.infer<typeof actualizarOportunidadSchema>;
export type FiltrosOportunidades = z.infer<typeof listarOportunidadesSchema>;
