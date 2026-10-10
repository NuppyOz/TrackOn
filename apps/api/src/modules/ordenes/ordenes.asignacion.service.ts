import { AppError } from '../../errors/AppError.js';
import * as asignaciones from './ordenes.asignacion.repository.js';
import * as ordenes from './ordenes.repository.js';
import type { AsignarOrdenInput } from './ordenes.asignacion.schema.js';

export async function asignar(ordenId: number, datos: AsignarOrdenInput, usuarioId: number) {
    await asignaciones.registrarAsignacion(ordenId, datos, usuarioId);
    const orden = await ordenes.buscarPorId(ordenId);
    if (!orden) throw new AppError(404, 'La orden no existe.');
    return { ...orden, numero: orden.numero.toString() };
}
