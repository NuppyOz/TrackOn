import { z } from 'zod';
import { paginacionQueryShape } from '../../shared/pagination.js';

const idSchema = z
    .string()
    .regex(/^[1-9]\d*$/, { error: 'El ID debe ser un número entero positivo.' })
    .transform(Number)
    .pipe(z.number().int().max(2147483647));

const textoOpcional = (maximo: number, campo: string) =>
    z.string({ error: `${campo} debe ser texto.` })
        .trim()
        .max(maximo, { error: `${campo} no debe superar ${maximo} caracteres.` })
        .transform((valor) => valor || null)
        .nullable()
        .optional();

export const equipoParamsSchema = z.strictObject({ id: idSchema });

export const createEquipoSchema = z.strictObject({
    ubicacionId: z.number().int().positive({ error: 'La ubicación es obligatoria.' }),
    codigo: z.string().trim().min(1, { error: 'El código es obligatorio.' }).max(40).toUpperCase(),
    tipo: z.string().trim().min(1, { error: 'El tipo es obligatorio.' }).max(100),
    marca: textoOpcional(100, 'La marca'),
    modelo: textoOpcional(100, 'El modelo'),
    numeroSerie: textoOpcional(150, 'El número de serie'),
    activo: z.boolean().optional(),
});

export const updateEquipoSchema = createEquipoSchema.partial().refine(
    (datos) => Object.keys(datos).length > 0,
    { error: 'Debes enviar al menos un dato para actualizar el equipo.' },
);

export const updateEstadoEquipoSchema = z.strictObject({
    activo: z.boolean({ error: 'El estado debe ser verdadero o falso.' }),
});

const queryId = z.preprocess((valor) => valor === '' ? undefined : valor, idSchema.optional());
const queryTexto = (maximo: number) => z.preprocess(
    (valor) => valor === '' ? undefined : valor,
    z.string().trim().max(maximo).optional(),
);

export const listarEquiposQuerySchema = z.strictObject({
    clienteId: queryId,
    ubicacionId: queryId,
    codigo: queryTexto(40),
    numeroSerie: queryTexto(150),
    estado: z.enum(['todos', 'activos', 'inactivos']).default('activos'),
    ...paginacionQueryShape,
});

export type CreateEquipoInput = z.infer<typeof createEquipoSchema>;
export type UpdateEquipoInput = z.infer<typeof updateEquipoSchema>;
export type EquipoFilters = z.infer<typeof listarEquiposQuerySchema>;
