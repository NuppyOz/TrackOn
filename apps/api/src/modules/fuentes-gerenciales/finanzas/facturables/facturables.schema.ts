import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100);
const cantidad = z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/);

export const listarFacturablesSchema = z.object({ q: z.string().trim().max(100).optional(), clienteId: id.optional(), ...paginacionQueryShape }).strict();
export const facturableIdSchema = z.object({ id }).strict();
export const crearFacturableSchema = z.object({
  clienteId: id, conceptoId: id, referencia, fechaEfectiva: fecha, cantidad,
  ordenId: id.optional(), ventaId: id.optional(), lineaCotizacionId: id.optional(), observacion: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, ctx) => {
  if ((value.ventaId === undefined) !== (value.lineaCotizacionId === undefined)) ctx.addIssue({ code: 'custom', message: 'ventaId y lineaCotizacionId deben enviarse juntos.' });
});
export const aplicarFacturableSchema = z.object({ lineaComprobanteId: id, cantidad, fechaEfectiva: fecha }).strict();

export type ListarFacturables = z.infer<typeof listarFacturablesSchema>;
export type CrearFacturable = z.infer<typeof crearFacturableSchema>;
export type AplicarFacturable = z.infer<typeof aplicarFacturableSchema>;
