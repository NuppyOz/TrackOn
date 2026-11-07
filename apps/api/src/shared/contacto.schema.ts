import { z } from "zod";

/** Acepta ocho dígitos nacionales o +505 seguido de ocho dígitos. Persiste siempre E.164. */
export const telefonoNicaraguenseSchema = z.preprocess(
    value => {
        if (typeof value !== "string") return value;
        const clean = value.trim();
        if (!clean) return null;
        return clean.startsWith("+505") ? clean.slice(4) : clean;
    },
    z.string()
        .regex(/^\d{8}$/, "Ingresa los 8 dígitos del teléfono nicaragüense; el código +505 se agrega automáticamente.")
        .transform(value => `+505${value}`).nullable().optional(),
);

/** El correo es opcional, se recorta y los valores vacíos se guardan como null. */
export const correoOpcionalSchema = (etiqueta = "El correo") => z.preprocess(
    value => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(254, `${etiqueta} no debe superar 254 caracteres.`)
        .pipe(z.email(`${etiqueta} no tiene un formato válido.`)).nullable().optional(),
);
