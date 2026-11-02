import { z } from 'zod';

const INT32_MAX = 2_147_483_647;
const idPositivo = z.number().int().min(1).max(INT32_MAX);
const versionEsperada = z.number().int().min(0).max(INT32_MAX);
const textoOpcional = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const clienteIdParamsSchema = z.object({ clienteId: z.coerce.number().int().min(1).max(INT32_MAX) }).strict();
export const contactoIdParamsSchema = z.object({
    clienteId: z.coerce.number().int().min(1).max(INT32_MAX),
    id: z.coerce.number().int().min(1).max(INT32_MAX),
}).strict();

export const actualizarPerfilSchema = z.object({
    version: versionEsperada,
    clasificacion: textoOpcional(60),
    instruccionesFacturacion: textoOpcional(500),
}).strict();

export const crearContactoSchema = z.object({
    nombre: z.string().trim().min(1).max(150),
    email: textoOpcional(254).refine(value => value == null || z.email().safeParse(value).success, 'Correo electrónico inválido'),
    telefono: textoOpcional(25),
    cargo: textoOpcional(100),
}).strict();

export const actualizarContactoSchema = z.object({
    version: versionEsperada.min(1),
    nombre: z.string().trim().min(1).max(150).optional(),
    email: textoOpcional(254).refine(value => value == null || z.email().safeParse(value).success, 'Correo electrónico inválido'),
    telefono: textoOpcional(25),
    cargo: textoOpcional(100),
    activo: z.boolean().optional(),
}).strict().refine(({ version: _version, ...campos }) => Object.values(campos).some(value => value !== undefined), {
    message: 'Envía al menos un campo para actualizar.',
});

export const listarContactosQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    pagina: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(25),
    sortBy: z.enum(['id', 'nombre', 'creadoEn']).default('creadoEn'),
    sortDir: z.enum(['asc', 'desc']).default('desc'),
}).strict();

export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;
export type CrearContactoInput = z.infer<typeof crearContactoSchema>;
export type ActualizarContactoInput = z.infer<typeof actualizarContactoSchema>;
export type ListarContactosQuery = z.infer<typeof listarContactosQuerySchema>;

export function assertIdPositivo(id: number): number {
    return idPositivo.parse(id);
}
