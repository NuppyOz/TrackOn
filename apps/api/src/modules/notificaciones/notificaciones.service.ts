import { AppError } from '../../errors/AppError.js';
import * as repository from './notificaciones.repository.js';
import type { NotificationQuery } from './notificaciones.schema.js';

export function listar(usuarioId: number, query: NotificationQuery) { return repository.listar(usuarioId, query); }
export function contarNoLeidas(usuarioId: number) { return repository.contarNoLeidas(usuarioId); }
export async function marcarLeida(usuarioId: number, id: number) {
    const result = await repository.marcarLeida(usuarioId, id);
    if (!result) throw new AppError(404, 'La notificación no existe.');
    return result;
}
