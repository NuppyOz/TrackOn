import { AppError } from '../../../../errors/AppError.js';
import { decimalFijo, dividirRedondeado, costoMicro, milesimas, valorNano } from '../../contracts/precision.js';

export const MAX_CANTIDAD_MIL = 10n ** 12n - 1n;
export const MAX_COSTO_MICRO = 10n ** 16n - 1n;
export const MAX_VALOR_NANO = 10n ** 30n - 1n;

export function cantidadMil(valor: string, permitirCero = false): bigint {
  return milesimas(valor, permitirCero);
}
export function costoUnitarioMicro(valor: string): bigint { return costoMicro(valor); }
export function valorImporteNano(valor: string): bigint { return valorNano(valor); }

export function valorEntradaNano(cantidad: bigint, costo: bigint): bigint {
  const valor = cantidad * costo;
  validarValor(valor);
  return valor;
}

export function valorSalidaNano(saldoCantidad: bigint, saldoValor: bigint, cantidad: bigint): bigint {
  if (cantidad <= 0n) throw new AppError(400, 'La cantidad debe ser mayor que cero.');
  if (cantidad > saldoCantidad || saldoCantidad <= 0n) throw new AppError(409, 'El movimiento dejaría una existencia negativa.');
  return cantidad === saldoCantidad ? saldoValor : dividirRedondeado(saldoValor * cantidad, saldoCantidad);
}

export function valorDevolucionNano(
  cantidadConsumo: bigint,
  valorConsumo: bigint,
  cantidadYaDevuelta: bigint,
  valorYaDevuelto: bigint,
  cantidadADevolver: bigint,
): bigint {
  const disponible = cantidadConsumo - cantidadYaDevuelta;
  if (cantidadADevolver <= 0n || cantidadADevolver > disponible) throw new AppError(409, 'La devolución supera la cantidad consumida que aún puede devolverse.');
  const residualValor = valorConsumo - valorYaDevuelto;
  const proporcional = dividirRedondeado(valorConsumo * cantidadADevolver, cantidadConsumo);
  const valor = cantidadADevolver === disponible ? residualValor : proporcional < residualValor ? proporcional : residualValor;
  if (valor < 0n) throw new AppError(409, 'El costo calculado de la devolución excede el residual del consumo.');
  return valor;
}

export function nuevoSaldo(saldoCantidad: bigint, saldoValor: bigint, sentido: 1 | -1, cantidad: bigint, valor: bigint) {
  const cantidadNueva = saldoCantidad + BigInt(sentido) * cantidad;
  const valorNuevo = saldoValor + BigInt(sentido) * valor;
  if (cantidadNueva < 0n || valorNuevo < 0n) throw new AppError(409, 'El movimiento dejaría una existencia o valor negativo.');
  if (cantidadNueva > MAX_CANTIDAD_MIL) throw new AppError(400, 'La cantidad supera el máximo permitido.');
  validarValor(valorNuevo);
  if (cantidadNueva === 0n && valorNuevo !== 0n) throw new AppError(409, 'No puede quedar valor residual cuando la existencia llega a cero.');
  return { cantidad: cantidadNueva, valor: valorNuevo };
}

export function costoPromedioMicro(saldoCantidad: bigint, saldoValor: bigint): bigint | null {
  if (saldoCantidad === 0n) return null;
  return dividirRedondeado(saldoValor, saldoCantidad);
}

export function decimalCantidad(valor: bigint): string { return decimalFijo(valor, 3); }
export function decimalCosto(valor: bigint): string { return decimalFijo(valor, 6); }
export function decimalValor(valor: bigint): string { return decimalFijo(valor, 9); }

export function validarValor(valor: bigint): void {
  if (valor < 0n || valor > MAX_VALOR_NANO) throw new AppError(400, 'El valor supera el máximo permitido.');
}
