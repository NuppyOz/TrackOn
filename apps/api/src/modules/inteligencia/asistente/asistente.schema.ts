import { z } from 'zod';
import { rangoQuerySchema } from '../contracts/inteligencia.schema.js';

export const areasAsistente = ['comercial', 'financiero', 'logistico', 'calidad'] as const;
export const explicarSchema = z.object({
  area: z.enum(areasAsistente),
  desde: z.iso.datetime({ offset: true }),
  hasta: z.iso.datetime({ offset: true }),
}).strict().superRefine((value, ctx) => {
  const parsed = rangoQuerySchema.safeParse({ desde: value.desde, hasta: value.hasta });
  if (!parsed.success) for (const issue of parsed.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
});

export type ExplicarInput = z.infer<typeof explicarSchema>;
