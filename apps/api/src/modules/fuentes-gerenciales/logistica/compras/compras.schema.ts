import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const version = z.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const cantidad = z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/).refine(value => !/^0(?:\.0+)?$/.test(value), 'La cantidad debe ser mayor que cero.');
const costo = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/);
const observacion = z.string().trim().max(1000).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const texto = (max: number) => z.string().trim().min(1).max(max).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');

export const compraIdSchema = z.object({ id }).strict();
export const lineaIdSchema = z.object({ id }).strict();
export const listarComprasSchema = z.object({ q: z.string().trim().max(100).optional(), ...paginacionQueryShape }).strict();
export const crearCompraSchema = z.object({
  proveedor: z.string().trim().toUpperCase().min(1).max(150).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.'), referencia, fechaEfectiva: fecha, observacion: observacion.optional(),
  lineas: z.array(z.object({ articuloId: id, cantidad, costoUnitario: costo, prometidaEn: fecha }).strict()).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  const ids = value.lineas.map(linea => linea.articuloId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Cada artículo debe aparecer una sola vez en la compra.', path: ['lineas'] });
  for (let i = 0; i < value.lineas.length; i++) {
    if (new Date(value.lineas[i]!.prometidaEn).getTime() < new Date(value.fechaEfectiva).getTime()) {
      ctx.addIssue({ code: 'custom', message: 'La fecha prometida debe ser igual o posterior a la compra.', path: ['lineas', i, 'prometidaEn'] });
    }
  }
});
export const recibirLineaSchema = z.object({ version, referencia, fechaEfectiva: fecha, cantidad, observacion: observacion.optional() }).strict();
export const cancelarPendienteSchema = z.object({ version, fechaEfectiva: fecha, motivo: texto(1000) }).strict();

export type CrearCompra = z.infer<typeof crearCompraSchema>;
export type RecibirLinea = z.infer<typeof recibirLineaSchema>;
export type CancelarPendiente = z.infer<typeof cancelarPendienteSchema>;
export type ListarCompras = z.infer<typeof listarComprasSchema>;
