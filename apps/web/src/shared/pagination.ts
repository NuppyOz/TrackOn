/** `total` llega de los catálogos que cuentan en el BE; sin él solo se puede avanzar con `hayMas`. */
export interface Pagina<T> { items: T[]; pagina: number; limite: number; hayMas: boolean; total?: number }

export const LIMITES_PAGINA: readonly number[] = [10, 20, 50, 100];

/** Ventana estilo DataTables: primera, última y las vecinas de la actual (1-based). */
export function paginasVisibles(actual: number, total: number): (number | 'gap')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const inicio = actual < 5 ? 2 : actual > total - 4 ? total - 4 : actual - 1;
    const fin = actual < 5 ? 5 : actual > total - 4 ? total - 1 : actual + 1;
    const medio = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    return [1, ...(inicio > 2 ? ['gap' as const] : []), ...medio, ...(fin < total - 1 ? ['gap' as const] : []), total];
}
