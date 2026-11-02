import { z } from 'zod';

const fecha = z.iso.datetime({ offset: true });
export const rangoQuerySchema = z.object({ desde: fecha, hasta: fecha }).strict().superRefine((value, ctx) => {
  const desde = Date.parse(value.desde), hasta = Date.parse(value.hasta);
  if (desde >= hasta) ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'hasta debe ser posterior a desde.' });
  if (hasta - desde > 366 * 24 * 60 * 60 * 1000) ctx.addIssue({ code: 'custom', path: ['hasta'], message: 'El rango máximo es de 366 días.' });
});
