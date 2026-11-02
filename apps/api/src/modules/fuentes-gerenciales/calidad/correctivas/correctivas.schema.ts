import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';
import { casoIdParamsSchema, cerrarCorrectivaSchema } from '../casos/casos.schema.js';

const idPositivo = z.coerce.number().int().min(1).max(2_147_483_647);
export const correctivaIdParamsSchema = z.object({ id: idPositivo }).strict();
export const listarCorrectivasSchema = z.object({
  q: z.string().trim().max(100).optional(),
  responsable: idPositivo.optional(),
  casoId: idPositivo.optional(),
  estado: z.enum(['abiertas', 'cerradas', 'todas']).default('todas'),
  ...paginacionQueryShape,
}).strict();
export const cerrarCorrectivaParamsSchema = casoIdParamsSchema;
export { cerrarCorrectivaSchema };
export type ListarCorrectivasInput = z.infer<typeof listarCorrectivasSchema>;
