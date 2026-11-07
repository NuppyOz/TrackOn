/**
 * Formato único de dinero para la interfaz.
 *
 * es-NI usa coma para miles y punto para decimales; el símbolo se pega al
 * número (`C$131,000.00`), que es como lo escribe el resumen general.
 * Cualquier pantalla que muestre importes debe usar estas funciones: tener
 * dos formatos en la misma sesión es un defecto, no un detalle.
 *
 * No se pasa por `Number`: los importes llegan del servidor como cadenas
 * decimales y `Decimal(16,2)` no cabe en un flotante (99 999 999 999 999.99
 * se convierte en 100 000 000 000 000). Se agrupa la parte entera del texto,
 * así el importe que se ve es exactamente el que devolvió la API.
 */

const IMPORTE = /^(-)?(\d+)(?:\.(\d+))?$/;

function formatear(valor: number | string | null | undefined, decimales: number, minimos: number): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    const texto = typeof valor === 'number' ? valor.toFixed(Math.max(decimales, 2)) : String(valor).trim();
    const partes = IMPORTE.exec(texto);
    if (!partes) return '—';
    const signo = partes[1] ?? '';
    const entero = partes[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let fraccion = partes[3] ?? '';
    fraccion = fraccion.length > decimales ? fraccion.slice(0, decimales) : fraccion.padEnd(minimos, '0');
    return `${signo}C$${entero}${fraccion ? `.${fraccion}` : ''}`;
}

/** Importe de dos decimales: `C$131,000.00`. */
export function formatearMoneda(valor: number | string | null | undefined): string {
    return formatear(valor, 2, 2);
}

/** Importe sin decimales, para tarjetas de resumen. */
export function formatearMonedaEntera(valor: number | string | null | undefined): string {
    return formatear(valor, 0, 0);
}

/**
 * Importe con la precisión que traiga el dato.
 *
 * Los saldos valorizados del inventario llegan con hasta nueve decimales y el
 * tablero los muestra tal cual: redondear ahí esconde justo la cifra que se
 * está vigilando. El formato es el mismo (coma de miles, símbolo pegado).
 */
export function formatearMonedaPrecisa(valor: number | string | null | undefined): string {
    return formatear(valor, 9, 2);
}
