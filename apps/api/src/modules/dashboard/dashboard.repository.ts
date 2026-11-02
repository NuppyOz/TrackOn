import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma.js';

export function jornadaManagua(ahora: Date) {
    const fecha = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Managua',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(ahora);
    const inicio = new Date(`${fecha}T00:00:00-06:00`);
    return { fecha, inicio, fin: new Date(inicio.getTime() + 86400000) };
}

export async function resumen(ahora = new Date(), periodo: 'hoy' | 'semana' | 'mes' = 'mes') {
    const { fecha, inicio, fin } = jornadaManagua(ahora);
    const inicioPeriodo =
        periodo === 'mes'
            ? new Date(`${fecha.slice(0, 7)}-01T00:00:00-06:00`)
            : new Date(inicio.getTime() - (periodo === 'semana' ? 6 : 0) * 86400000);
    const activas = { notIn: ['CERRADA', 'CANCELADA'] };
    return prisma.$transaction(
        async (tx) => {
            const [estados, programadasHoy, cerradasHoy, urgentes, recientes, atenciones, cuadrillas] =
                await Promise.all([
                    tx.ordenTrabajo.groupBy({ by: ['estadoCodigo'], _count: { _all: true } }),
                    tx.ordenTrabajo.count({
                        where: { fechaProgramada: { gte: inicio, lt: fin }, estadoCodigo: activas },
                    }),
                    tx.ordenTrabajo.count({
                        where: { cerradaEn: { gte: inicio, lt: fin }, estadoCodigo: 'CERRADA' },
                    }),
                    tx.ordenTrabajo.count({ where: { prioridad: 'URGENTE', estadoCodigo: activas } }),
                    tx.ordenTrabajo.findMany({
                        where: { estadoCodigo: { in: ['PENDIENTE', 'EN_REVISION'] } },
                        take: 8,
                        orderBy: [{ prioridad: 'desc' }, { creadaEn: 'asc' }],
                        select: {
                            id: true,
                            numero: true,
                            clienteNombreRegistrado: true,
                            solicitud: true,
                            estadoCodigo: true,
                            prioridad: true,
                            fechaProgramada: true,
                        },
                    }),
                    tx.ordenTrabajo.findMany({
                        where: { fechaProgramada: { gte: ahora, lt: fin }, estadoCodigo: activas },
                        take: 5,
                        orderBy: { fechaProgramada: 'asc' },
                        select: {
                            id: true,
                            numero: true,
                            clienteNombreRegistrado: true,
                            estadoCodigo: true,
                            fechaProgramada: true,
                        },
                    }),
                    tx.cuadrilla.findMany({
                        where: { activa: true },
                        take: 100,
                        orderBy: { nombre: 'asc' },
                        select: {
                            id: true,
                            nombre: true,
                            _count: {
                                select: {
                                    asignaciones: { where: { fin: null, orden: { estadoCodigo: activas } } },
                                },
                            },
                        },
                    }),
                ]);
            const [comprobantes, cobros, stockCritico, actividadReciente, operacionHoy, vencidas] =
                await Promise.all([
                    tx.comprobanteGerencial.findMany({
                        where: { anuladaEn: null, emitidaEn: { lte: ahora } },
                        select: {
                            importeFinal: true,
                            emitidaEn: true,
                            venceEn: true,
                            aplicaciones: {
                                where: { cobro: { revertidoEn: null, fechaEfectiva: { lte: ahora } } },
                                select: { importe: true },
                            },
                        },
                    }),
                    tx.cobroGerencial.aggregate({
                        where: { revertidoEn: null, fechaEfectiva: { gte: inicioPeriodo, lte: ahora } },
                        _sum: { importe: true },
                    }),
                    tx.$queryRaw<
                        { cantidad: bigint }[]
                    >`SELECT COUNT(*) AS cantidad FROM articulos_gerenciales WHERE "saldoCantidad" < minimo`,
                    tx.historialEstado.findMany({
                        where: { fecha: { lte: ahora } },
                        take: 6,
                        orderBy: { fecha: 'desc' },
                        select: {
                            id: true,
                            fecha: true,
                            motivo: true,
                            estadoNuevo: true,
                            orden: { select: { id: true, numero: true, clienteNombreRegistrado: true } },
                        },
                    }),
                    tx.ordenTrabajo.findMany({
                        where: { fechaProgramada: { gte: inicio, lt: fin } },
                        take: 2,
                        orderBy: { fechaProgramada: 'asc' },
                        select: {
                            id: true,
                            numero: true,
                            clienteNombreRegistrado: true,
                            solicitud: true,
                            estadoCodigo: true,
                            fechaProgramada: true,
                            asignaciones: {
                                take: 1,
                                orderBy: { inicio: 'desc' },
                                select: {
                                    cuadrilla: { select: { nombre: true } },
                                    empleadoResponsable: {
                                        select: {
                                            persona: { select: { firstName: true, firstLastName: true } },
                                        },
                                    },
                                },
                            },
                        },
                    }),
                    tx.ordenTrabajo.count({
                        where: { estadoCodigo: activas, fechaProgramada: { lt: ahora } },
                    }),
                ]);
            const saldo = (c: (typeof comprobantes)[number]) =>
                c.importeFinal.minus(
                    c.aplicaciones.reduce((sum, a) => sum.plus(a.importe), new Prisma.Decimal(0)),
                );
            const sum = (valores: Prisma.Decimal[]) =>
                valores.reduce((a, b) => a.plus(b), new Prisma.Decimal(0)).toFixed(2);
            const porEstado = Object.fromEntries(
                estados.map((item) => [item.estadoCodigo, item._count._all]),
            );
            return {
                finanzas: {
                    facturacion: sum(
                        comprobantes.filter((c) => c.emitidaEn >= inicioPeriodo).map((c) => c.importeFinal),
                    ),
                    cobros: cobros._sum.importe?.toFixed(2) ?? '0.00',
                    porCobrar: sum(comprobantes.map(saldo)),
                    vencido: sum(comprobantes.filter((c) => c.venceEn < ahora).map(saldo)),
                },
                stockCritico: Number(stockCritico[0]?.cantidad ?? 0),
                atrasadas: vencidas,
                actividadReciente: actividadReciente.map((a) => ({
                    ...a,
                    orden: { ...a.orden, numero: String(a.orden.numero) },
                })),
                operacionHoy: operacionHoy.map((o) => ({
                    ...o,
                    numero: String(o.numero),
                    responsable:
                        o.asignaciones[0]?.cuadrilla?.nombre ??
                        (o.asignaciones[0]?.empleadoResponsable
                            ? `${o.asignaciones[0].empleadoResponsable.persona.firstName} ${o.asignaciones[0].empleadoResponsable.persona.firstLastName}`
                            : 'Pendiente de asignación'),
                    asignaciones: undefined,
                })),
                fecha,
                zonaHoraria: 'America/Managua',
                abiertas: estados
                    .filter((item) => !['CERRADA', 'CANCELADA'].includes(item.estadoCodigo))
                    .reduce((total, item) => total + item._count._all, 0),
                pendientes: porEstado.PENDIENTE ?? 0,
                enProceso: porEstado.EN_EJECUCION ?? 0,
                enRevision: porEstado.EN_REVISION ?? 0,
                cerradas: porEstado.CERRADA ?? 0,
                porEstado,
                programadasHoy,
                cerradasHoy,
                urgentes,
                requierenAtencion: recientes.map((item) => ({ ...item, numero: String(item.numero) })),
                proximas: atenciones.map((item) => ({ ...item, numero: String(item.numero) })),
                cuadrillas: cuadrillas.map((item) => ({
                    id: item.id,
                    nombre: item.nombre,
                    ordenesActivas: item._count.asignaciones,
                })),
            };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
}
