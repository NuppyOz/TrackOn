import { prisma } from '../../infrastructure/prisma.js';
import type { NotificationQuery } from './notificaciones.schema.js';

const notificationSelect = { id: true, tipo: true, mensaje: true, creadaEn: true, leidaEn: true, ordenId: true } as const;

export async function listar(usuarioId: number, query: NotificationQuery) {
    const [rows, noLeidas] = await Promise.all([
        prisma.notificacion.findMany({
            where: { usuarioId }, select: notificationSelect,
            orderBy: [{ creadaEn: 'desc' }, { id: 'desc' }],
            ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
            take: query.limite + 1,
        }),
        prisma.notificacion.count({ where: { usuarioId, leidaEn: null } }),
    ]);
    const hayMas = rows.length > query.limite;
    const items = rows.slice(0, query.limite);
    return { items, noLeidas, nextCursor: hayMas ? items.at(-1)?.id ?? null : null };
}

export function contarNoLeidas(usuarioId: number) {
    return prisma.notificacion.count({ where: { usuarioId, leidaEn: null } });
}

export async function marcarLeida(usuarioId: number, id: number) {
    const notification = await prisma.notificacion.findFirst({ where: { id, usuarioId }, select: { id: true, leidaEn: true } });
    if (!notification) return null;
    if (!notification.leidaEn) await prisma.notificacion.updateMany({ where: { id, usuarioId, leidaEn: null }, data: { leidaEn: new Date() } });
    return { id: notification.id };
}
