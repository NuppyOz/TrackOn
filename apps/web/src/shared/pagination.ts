export interface Pagina<T> {
    items: T[];
    pagina: number;
    limite: number;
    hayMas: boolean;
    total?: number;
}

export const DEFAULT_PAGE_SIZE = 10;

export type PaginaVisible = number | 'inicio-ellipsis' | 'fin-ellipsis';

export function paginasVisibles(actual: number, total: number): PaginaVisible[] {
    if (total <= 5) return Array.from({ length: total }, (_, indice) => indice + 1);
    if (actual <= 3) return [1, 2, 3, 'fin-ellipsis', total];
    if (actual >= total - 2) return [1, 'inicio-ellipsis', total - 2, total - 1, total];
    return [1, 'inicio-ellipsis', actual, 'fin-ellipsis', total];
}

/** Páginas navegables cuando el API solo informa si existe una página siguiente. */
export function paginasVisiblesSinTotal(actual: number, hayMas: boolean): PaginaVisible[] {
    const ultimaConocida = actual + (hayMas ? 1 : 0);
    if (ultimaConocida <= 5) return Array.from({ length: ultimaConocida }, (_, indice) => indice + 1);
    return [1, 'inicio-ellipsis', actual - 1, actual, ...(hayMas ? [actual + 1] : [])];
}
