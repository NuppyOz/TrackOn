/**
 * Formato único de dinero para la interfaz.
 *
 * es-NI usa coma para miles y punto para decimales; el símbolo se pega al
 * número (`C$131,000.00`), que es como lo escribe el resumen general.
 * Cualquier pantalla que muestre importes debe usar estas funciones: tener
 * dos formatos en la misma sesión es un defecto, no un detalle.
 */
const moneda = new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatearMoneda(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const numero = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(numero) ? moneda.format(numero) : '—';
}

/** Importe sin decimales, para tarjetas de resumen. */
export function formatearMonedaEntera(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const numero = typeof valor === 'number' ? valor : Number(valor);
    return Number.isFinite(numero)
        ? new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', maximumFractionDigits: 0 }).format(numero)
        : '—';
}
