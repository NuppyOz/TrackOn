import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const cantidad = z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/).refine(value => value !== '0' && !/^0(?:\.0+)?$/.test(value), 'La cantidad debe ser mayor que cero.');
const costo = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/);
const observacion = z.string().trim().min(1).max(1000).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');

export const movimientoIdSchema = z.object({ id }).strict();
export const listarMovimientosSchema = z.object({
  q: z.string().trim().max(100).optional(), articuloId: id.optional(),
  desde: fecha.optional(), hasta: fecha.optional(), ...paginacionQueryShape,
}).strict().refine(value => !value.desde || !value.hasta || new Date(value.desde).getTime() <= new Date(value.hasta).getTime(), { message: 'desde debe ser anterior o igual a hasta.', path: ['hasta'] });

export const registrarMovimientoSchema = z.object({
  articuloId: id,
  tipo: z.enum(['ENTRADA', 'CONSUMO', 'DEVOLUCION', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO']),
  referencia, fechaEfectiva: fecha, cantidad, costoUnitario: costo.optional(), origenId: id.optional(), ordenId: id.optional(), observacion,
}).strict().superRefine((value, ctx) => {
  const requiereCosto = value.tipo === 'ENTRADA' || value.tipo === 'AJUSTE_POSITIVO';
  if (requiereCosto && value.costoUnitario === undefined) ctx.addIssue({ code: 'custom', message: 'Este movimiento requiere costoUnitario.', path: ['costoUnitario'] });
  if (!requiereCosto && value.costoUnitario !== undefined) ctx.addIssue({ code: 'custom', message: 'Este movimiento calcula su valor desde el saldo u origen.', path: ['costoUnitario'] });
  if ((value.tipo === 'DEVOLUCION') !== (value.origenId !== undefined)) ctx.addIssue({ code: 'custom', message: 'origenId se requiere únicamente para DEVOLUCION.', path: ['origenId'] });
  if (value.tipo !== 'CONSUMO' && value.ordenId !== undefined) ctx.addIssue({ code: 'custom', message: 'ordenId solo aplica a CONSUMO.', path: ['ordenId'] });
});

export const revertirMovimientoSchema = z.object({ referencia, fechaEfectiva: fecha, observacion }).strict();
export type RegistrarMovimiento = z.infer<typeof registrarMovimientoSchema>;
export type RevertirMovimiento = z.infer<typeof revertirMovimientoSchema>;
export type ListarMovimientos = z.infer<typeof listarMovimientosSchema>;
