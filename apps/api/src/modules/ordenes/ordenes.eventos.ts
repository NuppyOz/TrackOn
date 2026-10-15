import type { Prisma } from '@prisma/client';

export async function registrarEventoOrden(tx: Prisma.TransactionClient, ordenId: number, estadoAnterior: string, estadoNuevo: string, usuarioId: number, motivo: string) {
    await tx.auditoria.create({ data: {
        usuarioId, tipoActor: 'USUARIO', entidad: 'ORDEN_TRABAJO', entidadId: String(ordenId), accion: 'CAMBIAR_ESTADO',
        datosAnteriores: { estado: estadoAnterior }, datosNuevos: { estado: estadoNuevo, motivo },
    } });
    await notificarOrden(tx, ordenId, usuarioId, estadoNuevo === 'ASIGNADA' ? 'ASIGNACION' : 'CAMBIO_ESTADO',
        `La orden ${ordenId} pasó a ${estadoNuevo.replaceAll('_', ' ')}. ${motivo}`);
}

async function notificarOrden(tx: Prisma.TransactionClient, ordenId: number, usuarioId: number, tipo: string, mensaje: string) {
    const destinatarios = await tx.usuario.findMany({
        where: {
            activo: true, id: { not: usuarioId }, empleado: { active: true },
            OR: [
                { rol: { cod: { in: ['ADMIN', 'GTE_OPE'] } } },
                { empleado: { asignacionesIndividuales: { some: { ordenId, fin: null } } } },
                { empleado: { participaciones: { some: { asignacion: { ordenId, fin: null } } } } },
                { empleado: { membresias: { some: { fin: null, cuadrilla: { asignaciones: { some: { ordenId, fin: null } } } } } } },
            ],
        }, select: { id: true },
    });
    if (destinatarios.length) await tx.notificacion.createMany({ data: destinatarios.map(item => ({
        usuarioId: item.id, ordenId, tipo, mensaje,
    })) });
}

interface DatosEdicion { solicitud: string; prioridad: string; fechaProgramada: string | null }
export async function registrarEdicionOrden(tx: Prisma.TransactionClient, ordenId: number, usuarioId: number,
    anteriores: DatosEdicion, nuevos: DatosEdicion) {
    await tx.auditoria.create({ data: {
        usuarioId, tipoActor: 'USUARIO', entidad: 'ORDEN_TRABAJO', entidadId: String(ordenId), accion: 'ACTUALIZAR',
        datosAnteriores: { ...anteriores }, datosNuevos: { ...nuevos },
    } });
    await notificarOrden(tx, ordenId, usuarioId, 'ACTUALIZACION_ORDEN',
        `Se actualizaron los datos de la orden ${ordenId}. Revisa su solicitud, prioridad y programación.`);
}
