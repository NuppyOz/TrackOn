import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma.js';

export function jornadaManagua(ahora: Date) {
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
    const inicio = new Date(`${fecha}T00:00:00-06:00`);
    return { fecha, inicio, fin: new Date(inicio.getTime() + 86400000) };
}

export async function resumen(ahora = new Date()) {
    const { fecha, inicio, fin } = jornadaManagua(ahora);
    const activas = { notIn: ['CERRADA', 'CANCELADA'] };
    return prisma.$transaction(async tx => {
        const [estados, programadasHoy, cerradasHoy, urgentes, recientes, atenciones, cuadrillas] = await Promise.all([
            tx.ordenTrabajo.groupBy({ by: ['estadoCodigo'], _count: { _all: true } }),
            tx.ordenTrabajo.count({ where: { fechaProgramada: { gte: inicio, lt: fin }, estadoCodigo: activas } }),
            tx.ordenTrabajo.count({ where: { cerradaEn: { gte: inicio, lt: fin }, estadoCodigo: 'CERRADA' } }),
            tx.ordenTrabajo.count({ where: { prioridad: 'URGENTE', estadoCodigo: activas } }),
            tx.ordenTrabajo.findMany({ where: { estadoCodigo: { in: ['PENDIENTE', 'EN_REVISION'] } },
                take: 8, orderBy: [{ prioridad: 'desc' }, { creadaEn: 'asc' }],
                select: { id: true, numero: true, clienteNombreRegistrado: true, solicitud: true, estadoCodigo: true, prioridad: true, fechaProgramada: true } }),
            tx.ordenTrabajo.findMany({ where: { fechaProgramada: { gte: ahora, lt: fin }, estadoCodigo: activas },
                take: 5, orderBy: { fechaProgramada: 'asc' },
                select: { id: true, numero: true, clienteNombreRegistrado: true, estadoCodigo: true, fechaProgramada: true } }),
            tx.cuadrilla.findMany({ where: { activa: true }, take: 100, orderBy: { nombre: 'asc' },
                select: { id: true, nombre: true, _count: { select: { asignaciones: { where: { fin: null, orden: { estadoCodigo: activas } } } } } } }),
        ]);
        const porEstado = Object.fromEntries(estados.map(item => [item.estadoCodigo, item._count._all]));
        return {
            fecha, zonaHoraria: 'America/Managua',
            abiertas: estados.filter(item => !['CERRADA', 'CANCELADA'].includes(item.estadoCodigo)).reduce((total, item) => total + item._count._all, 0),
            pendientes: porEstado.PENDIENTE ?? 0, enProceso: porEstado.EN_EJECUCION ?? 0,
            enRevision: porEstado.EN_REVISION ?? 0, cerradas: porEstado.CERRADA ?? 0,
            programadasHoy, cerradasHoy, urgentes,
            requierenAtencion: recientes.map(item => ({ ...item, numero: String(item.numero) })),
            proximas: atenciones.map(item => ({ ...item, numero: String(item.numero) })),
            cuadrillas: cuadrillas.map(item => ({ id: item.id, nombre: item.nombre, ordenesActivas: item._count.asignaciones })),
        };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
