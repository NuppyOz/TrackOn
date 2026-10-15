import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';

export interface ActorOrden { id: number; empleadoId: number; rol: string }

export function obtenerActorOrden(req: Request): ActorOrden {
    if (!req.auth) throw new AppError(401, 'Se requiere autenticación.');
    return { id: req.auth.usuario.id, empleadoId: req.auth.usuario.empleado.id, rol: req.auth.usuario.rol.cod };
}

export async function autorizarTecnico(tx: Prisma.TransactionClient, ordenId: number, actor: ActorOrden) {
    if (actor.rol !== 'TEC') return;
    const asignacion = await tx.asignacion.findFirst({
        where: {
            ordenId, fin: null,
            OR: [
                { empleadoResponsableId: actor.empleadoId },
                { tecnicos: { some: { empleadoId: actor.empleadoId } } },
                { cuadrilla: { is: { miembros: { some: { empleadoId: actor.empleadoId, fin: null } } } } },
            ],
        }, select: { id: true },
    });
    if (!asignacion) throw new AppError(403, 'Solo los técnicos asignados pueden modificar esta orden.');
}

export async function bloquearEjecucion(tx: Prisma.TransactionClient, ordenId: number, actor: ActorOrden) {
    const orden = await tx.ordenTrabajo.findUnique({
        where: { id: ordenId }, select: { estadoCodigo: true, version: true },
    });
    if (!orden) throw new AppError(404, 'La orden no existe.');
    if (orden.estadoCodigo !== 'EN_EJECUCION') throw new AppError(409, 'El trabajo se registra únicamente durante la ejecución.');
    await autorizarTecnico(tx, ordenId, actor);
    const cambio = await tx.ordenTrabajo.updateMany({
        where: { id: ordenId, estadoCodigo: 'EN_EJECUCION', version: orden.version },
        data: { version: { increment: 1 } },
    });
    if (cambio.count !== 1) throw new AppError(409, 'La orden cambió; actualiza su información antes de continuar.');
}
