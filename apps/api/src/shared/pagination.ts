import { z } from 'zod';

const enteroPositivo = (porDefecto: number, maximo: number, campo: string) => z.preprocess(
    (valor) => valor === undefined || valor === '' ? porDefecto : Number(valor),
    z.number().int({ error: `${campo} debe ser un entero.` }).min(1, { error: `${campo} debe ser mayor que cero.` }).max(maximo, { error: `${campo} no puede superar ${maximo}.` }),
);

/** Límite acotado: la capa HTTP nunca devuelve una colección ilimitada. */
export const paginacionQueryShape = {
    pagina: enteroPositivo(1, 1_000_000, 'pagina'),
    limite: enteroPositivo(25, 100, 'limite'),
};

export type Paginacion = { pagina: number; limite: number };

export function paginaDesde<T>(items: T[], { pagina, limite }: Paginacion) {
    const hayMas = items.length > limite;
    return { items: items.slice(0, limite), pagina, limite, hayMas };
}
