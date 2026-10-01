import { z } from 'zod';

export const loginSchema = z.strictObject({
    identificador: z
        .string({
            error: 'El identificador debe ser texto.',
        })
        .trim()
        .min(3, {
            error: 'El identificador debe tener al menos 3 caracteres.',
        })
        .max(100, {
            error: 'El identificador no debe superar 100 caracteres.',
        })
        .toLowerCase(),

    password: z
        .string({
            error: 'La contraseña debe ser texto.',
        })
        .min(1, {
            error: 'La contraseña es obligatoria.',
        })
        .max(128, {
            error: 'La contraseña no debe superar 128 caracteres.',
        }),
});

export type LoginInput =
    z.infer<typeof loginSchema>;