import { AppError } from '../../../../errors/AppError.js';
import { prisma } from '../../../../infrastructure/prisma.js';
import * as repository from './historial.repository.js';
import type { HistorialQuery } from './historial.schema.js';

export async function listar(clienteId: number, filtros: HistorialQuery) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    if (!cliente) throw new AppError(404, 'El cliente no existe.');
    const rows = await repository.listar(clienteId, filtros);
    const hayMas = rows.length > filtros.limite;
    return {
        items: rows.slice(0, filtros.limite).map(row => ({ ...row, fecha: row.fecha.toISOString() })),
        pagina: filtros.pagina,
        limite: filtros.limite,
        hayMas,
        alcance: 'COMERCIAL' as const,
    };
}
