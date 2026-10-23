/** Dinero comercial y cantidades expresados con enteros escalados. */

export class ErrorDominioCotizacion extends Error {
    constructor(message: string, readonly codigo: string, readonly campo?: string) {
        super(message);
        this.name = 'ErrorDominioCotizacion';
    }
}

export const MAX_CANTIDAD_MILESIMAS = 999_999_999_999n;
export const MAX_IMPORTE_CENTAVOS = 9_999_999_999_999_999n;

function decimalEscalado(valor: string, escala: number, campo: string): bigint {
    if (typeof valor !== 'string' || !new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${escala}})?$`).test(valor)) {
        throw new ErrorDominioCotizacion(`Valor decimal inválido (máximo ${escala} decimales)`, 'DECIMAL_INVALIDO', campo);
    }
    const [entero, fraccion = ''] = valor.split('.');
    return BigInt(entero) * 10n ** BigInt(escala) + BigInt((fraccion + '0'.repeat(escala)).slice(0, escala) || '0');
}

export function parseCantidad3(valor: string, campo = 'cantidad'): bigint {
    const cantidad = decimalEscalado(valor, 3, campo);
    if (cantidad <= 0n) throw new ErrorDominioCotizacion('La cantidad debe ser mayor que cero', 'CANTIDAD_INVALIDA', campo);
    if (cantidad > MAX_CANTIDAD_MILESIMAS) throw new ErrorDominioCotizacion('La cantidad supera Decimal(12,3)', 'DECIMAL_FUERA_DE_RANGO', campo);
    return cantidad;
}

export function parseDecimal2(valor: string, campo = 'importe'): bigint {
    const importe = decimalEscalado(valor, 2, campo);
    if (importe > MAX_IMPORTE_CENTAVOS) throw new ErrorDominioCotizacion('El importe supera Decimal(16,2)', 'DECIMAL_FUERA_DE_RANGO', campo);
    return importe;
}

export function formatearDecimal2(valorCentavos: bigint): string {
    if (valorCentavos < 0n) throw new ErrorDominioCotizacion('El importe no puede ser negativo', 'IMPORTE_INVALIDO');
    return `${valorCentavos / 100n}.${(valorCentavos % 100n).toString().padStart(2, '0')}`;
}

/** Redondeo comercial mitad arriba para valores no negativos. */
export function subtotalLineaCentavos(cantidadMilesimas: bigint, precioCentavos: bigint): bigint {
    if (cantidadMilesimas <= 0n) throw new ErrorDominioCotizacion('La cantidad debe ser mayor que cero', 'CANTIDAD_INVALIDA', 'cantidad');
    if (precioCentavos < 0n) throw new ErrorDominioCotizacion('El precio no puede ser negativo', 'IMPORTE_INVALIDO', 'precio');
    return (cantidadMilesimas * precioCentavos + 500n) / 1000n;
}

export interface EntradaLineaCotizacion {
    cantidad: string;
    precio: string;
    descuento: string;
}

export interface LineaCotizacionCalculada {
    cantidad: string;
    precio: string;
    descuento: string;
    subtotal: string;
    total: string;
}

export function calcularLineaCotizacion(entrada: EntradaLineaCotizacion): LineaCotizacionCalculada {
    const cantidad = parseCantidad3(entrada.cantidad);
    const precio = parseDecimal2(entrada.precio, 'precio');
    const descuento = parseDecimal2(entrada.descuento, 'descuento');
    const subtotal = subtotalLineaCentavos(cantidad, precio);
    if (subtotal > MAX_IMPORTE_CENTAVOS) throw new ErrorDominioCotizacion('El subtotal supera Decimal(16,2)', 'DECIMAL_FUERA_DE_RANGO', 'subtotal');
    if (descuento > subtotal) {
        throw new ErrorDominioCotizacion('El descuento no puede superar el subtotal de la línea', 'DESCUENTO_SUPERA_SUBTOTAL', 'descuento');
    }
    return {
        cantidad: entrada.cantidad.includes('.') ? entrada.cantidad.replace(/0+$/, '').replace(/\.$/, '') : entrada.cantidad,
        precio: formatearDecimal2(precio),
        descuento: formatearDecimal2(descuento),
        subtotal: formatearDecimal2(subtotal),
        total: formatearDecimal2(subtotal - descuento),
    };
}

export function sumarTotalesCotizacion(totales: readonly string[]): string {
    if (totales.length > 100) throw new ErrorDominioCotizacion('La cotización admite máximo 100 líneas', 'DEMASIADAS_LINEAS', 'lineas');
    const total = totales.reduce((suma, importe, indice) => suma + parseDecimal2(importe, `lineas.${indice}.total`), 0n);
    if (total > MAX_IMPORTE_CENTAVOS) throw new ErrorDominioCotizacion('El total supera Decimal(16,2)', 'DECIMAL_FUERA_DE_RANGO', 'total');
    return formatearDecimal2(total);
}
