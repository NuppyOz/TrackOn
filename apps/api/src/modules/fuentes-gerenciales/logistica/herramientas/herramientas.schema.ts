import { z } from 'zod';
import { paginacionQueryShape } from '../../../../shared/pagination.js';

const id = z.coerce.number().int().min(1).max(2_147_483_647);
const fecha = z.iso.datetime({ offset: true });
const referencia = z.string().trim().toUpperCase().min(1).max(100);
const textoPlano = (max: number) => z.string().trim().min(1).max(max).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.');

export const herramientaIdSchema = z.object({ id }).strict();
export const prestamoIdSchema = z.object({ id }).strict();
export const listarHerramientasSchema = z.object({ q: z.string().trim().max(100).optional(), ...paginacionQueryShape }).strict();
export const crearHerramientaSchema = z.object({ codigo: z.string().trim().toUpperCase().min(1).max(60).refine(value => !/<[^>]*>/.test(value), 'No se permite HTML.'), nombre: textoPlano(150) }).strict();
export const prestarHerramientaSchema = z.object({
  empleadoId: id, referencia, prestadaEn: fecha, previstaEn: fecha, observacion: textoPlano(1000).optional(),
}).strict().refine(value => new Date(value.previstaEn).getTime() >= new Date(value.prestadaEn).getTime(), { message: 'La fecha prevista debe ser igual o posterior a la fecha del préstamo.', path: ['previstaEn'] });
export const devolverPrestamoSchema = z.object({ devueltaEn: fecha, observacion: textoPlano(1000).optional() }).strict();

export type CrearHerramienta = z.infer<typeof crearHerramientaSchema>;
export type PrestarHerramienta = z.infer<typeof prestarHerramientaSchema>;
export type DevolverPrestamo = z.infer<typeof devolverPrestamoSchema>;
export type ListarHerramientas = z.infer<typeof listarHerramientasSchema>;
