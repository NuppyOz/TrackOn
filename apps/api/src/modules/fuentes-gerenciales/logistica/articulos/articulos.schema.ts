import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const codigo = z.string().trim().toUpperCase().min(1).max(60).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const referencia = z.string().trim().toUpperCase().min(1).max(100).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');
const cantidad = z.string().regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/);
const costo = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/);
const textoPlano = (max: number, min = 1) => z.string().trim().min(min).max(max).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');

export const articuloIdSchema = z.object({ id }).strict();
export const listarArticulosSchema = z.object({ q: z.string().trim().max(100).optional(), ...paginacionQueryShape }).strict();
export const crearArticuloSchema = z.object({
  codigo, nombre: textoPlano(150), unidad: textoPlano(30), minimo: cantidad,
  materialId: id.optional(),
  apertura: z.object({ referencia, fechaEfectiva: fecha, cantidad, costoUnitario: costo, observacion: textoPlano(1000) }).strict(),
}).strict();

export type CrearArticulo = z.infer<typeof crearArticuloSchema>;
export type ListarArticulos = z.infer<typeof listarArticulosSchema>;
