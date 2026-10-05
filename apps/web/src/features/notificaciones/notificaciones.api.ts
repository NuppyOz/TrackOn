import { api } from '../../shared/api'
export interface Notificacion { id: number; tipo: string; mensaje: string; creadaEn: string; leidaEn: string | null; ordenId: number | null }
export interface NotificacionesPagina { items: Notificacion[]; noLeidas: number; nextCursor: number | null }
export function listarNotificaciones(cursor?: number | null) {
  const query = new URLSearchParams({ limite: '20' })
  if (cursor) query.set('cursor', String(cursor))
  return api<NotificacionesPagina>(`/api/notificaciones?${query}`)
}
export function contarNoLeidas() { return api<{ noLeidas: number }>('/api/notificaciones/unread-count') }
export function marcarNotificacionLeida(id: number) { return api<{ id: number }>(`/api/notificaciones/${id}/leida`, { method: 'PATCH' }) }
