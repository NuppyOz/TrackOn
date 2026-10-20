import { z } from 'zod';

const MAX_ID = 2_147_483_647;
const id = z.coerce.number().int().min(1).max(MAX_ID);
const texto = (max: number) => z.string().trim().min(1).max(max).refine(value => !/<[^>]*>/.test(value), 'No se admite HTML.');
const sinHtmlCodigo = z.string().trim().min(1).max(40)
    .transform(value => value.toUpperCase())
    .refine(value => value.length <= 40, 'El código normalizado no puede superar 40 caracteres.')
    .refine(value => !/<[^>]*>/.test(value), 'No se admite HTML.');

export const crearConceptoSchema = z.object({
    codigo: sinHtmlCodigo,
    tipo: z.enum(['SERVICIO', 'MANO_OBRA', 'EQUIPO', 'REPUESTO', 'INSUMO']),
    nombre: texto(150),
    unidad: texto(30),
    servicioId: id.nullable().optional(),
    materialId: id.nullable().optional(),
}).strict().refine(value => !(value.servicioId != null && value.materialId != null), {
    message: 'Un concepto puede referenciar un servicio o un material, no ambos.',
    path: ['materialId'],
});

export const actualizarConceptoSchema = z.object({
    version: z.number().int().min(1).max(MAX_ID),
    nombre: texto(150).optional(),
    unidad: texto(30).optional(),
    activo: z.boolean().optional(),
}).strict().refine(({ version: _version, ...fields }) => Object.values(fields).some(value => value !== undefined), {
    message: 'Envía al menos un campo además de la versión.',
});

export const listarConceptosSchema = z.object({
    q: z.string().trim().max(100).optional(),
    estado: z.enum(['activos', 'inactivos', 'todos']).default('todos'),
    pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.enum(['codigo', 'nombre', 'creadoEn']).default('nombre'),
    sortDir: z.enum(['asc', 'desc']).default('asc'),
}).strict();

const precioDecimal2 = z.string().max(20).regex(/^\d+(?:\.\d{1,2})?$/, 'El precio debe ser decimal no negativo con hasta dos decimales.');
export const crearTarifaSchema = z.object({
    conceptoId: id,
    clienteId: id.nullable().optional(),
    moneda: z.literal('NIO').optional(),
    precio: precioDecimal2,
}).strict();

export const listarTarifasSchema = z.object({
    conceptoId: id.optional(),
    clienteId: id.optional(),
    estado: z.enum(['activos', 'inactivos', 'todos']).default('todos'),
    q: z.string().trim().max(100).optional(),
    pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.enum(['id', 'creadaEn']).default('creadaEn'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export const cambiarEstadoTarifaSchema = z.object({
    version: z.number().int().min(1).max(MAX_ID),
    activo: z.boolean(),
}).strict();

export const resolverTarifaQuerySchema = z.object({ conceptoId: id, clienteId: id }).strict();
export const idParamsSchema = z.object({ id }).strict();

export type CrearConcepto = z.infer<typeof crearConceptoSchema>;
export type ActualizarConcepto = z.infer<typeof actualizarConceptoSchema>;
export type ListarConceptos = z.infer<typeof listarConceptosSchema>;
export type CrearTarifa = z.infer<typeof crearTarifaSchema>;
export type ListarTarifas = z.infer<typeof listarTarifasSchema>;
export type CambiarEstadoTarifa = z.infer<typeof cambiarEstadoTarifaSchema>;
