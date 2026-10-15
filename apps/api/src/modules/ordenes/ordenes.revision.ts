import type { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError.js';

export async function validarTrabajoCompleto(tx: Prisma.TransactionClient, ordenId: number, cerrar = false) {
    const equipos = await tx.ordenEquipo.findMany({
        where: { ordenId }, select: {
            id: true, diagnostico: true, resultado: true,
            servicios: { select: { id: true } },
            evidencias: { where: { reemplazos: { none: {} } }, select: { estadoCarga: true, revisiones: { select: { decision: true }, take: 1, orderBy: [{ revisadaEn: 'desc' }, { id: 'desc' }] } } },
        },
    });
    if (equipos.length === 0) throw new AppError(409, 'Registra al menos un equipo intervenido antes de enviar a revisión o cerrar.');
    for (const equipo of equipos) {
        if (!equipo.diagnostico?.trim() || !equipo.resultado?.trim()) {
            throw new AppError(409, `Completa el diagnóstico y resultado del equipo intervenido ${equipo.id}.`);
        }
        if (equipo.servicios.length === 0) throw new AppError(409, `Registra al menos un servicio realizado en el equipo intervenido ${equipo.id}.`);
        validarEvidencias(equipo.evidencias, cerrar);
    }
}

function validarEvidencias(evidencias: { estadoCarga: string; revisiones: { decision: string }[] }[], cerrar: boolean) {
    if (evidencias.some(item => item.estadoCarga !== 'DISPONIBLE')) throw new AppError(409, 'Completa las cargas pendientes o fallidas antes de enviar a revisión o cerrar.');
    if (cerrar && evidencias.some(item => item.revisiones[0]?.decision !== 'ACEPTADA')) throw new AppError(409, 'Aprueba las evidencias antes del cierre. Si necesitan correcciones, devuelve la orden a ejecución.');
}
