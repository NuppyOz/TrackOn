import { AppError } from '../../../errors/AppError.js';

/** Entrada decimal estricta; nunca convierte importes a Number. */
export function leerDecimal(valor: string, escala: number, digitosEnteros: number, permitirCero = true): bigint {
    if (typeof valor !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(valor)) throw new AppError(400, 'El valor debe ser un decimal sin signo ni notación exponencial.');
    const [entero = '', fraccion = ''] = valor.split('.');
    if (entero.length > digitosEnteros || fraccion.length > escala) throw new AppError(400, `El valor admite ${digitosEnteros} dígitos enteros y ${escala} decimales.`);
    const cantidad = BigInt(entero) * 10n ** BigInt(escala) + BigInt(fraccion.padEnd(escala, '0') || '0');
    if (!permitirCero && cantidad === 0n) throw new AppError(400, 'El valor debe ser mayor que cero.');
    return cantidad;
}

export function decimalFijo(valor: bigint, escala: number): string {
    const signo = valor < 0n ? '-' : '';
    const absoluto = valor < 0n ? -valor : valor;
    const factor = 10n ** BigInt(escala);
    return escala === 0 ? `${signo}${absoluto}` : `${signo}${absoluto / factor}.${(absoluto % factor).toString().padStart(escala, '0')}`;
}

/** Mitades se alejan de cero; la división nunca pasa por coma flotante. */
export function dividirRedondeado(numerador: bigint, denominador: bigint): bigint {
    if (denominador <= 0n) throw new Error('El denominador debe ser positivo.');
    const signo = numerador < 0n ? -1n : 1n;
    const absoluto = numerador < 0n ? -numerador : numerador;
    return signo * ((absoluto + denominador / 2n) / denominador);
}

export const centavos = (valor: string, permitirCero = true) => leerDecimal(valor, 2, 14, permitirCero);
export const milesimas = (valor: string, permitirCero = false) => leerDecimal(valor, 3, 9, permitirCero);
export const costoMicro = (valor: string) => leerDecimal(valor, 6, 10);
export const valorNano = (valor: string) => leerDecimal(valor, 9, 21);
export function porcentaje(numerador: bigint, denominador: bigint): string | null {
    return denominador <= 0n ? null : decimalFijo(dividirRedondeado(numerador * 10_000n, denominador), 2);
}
