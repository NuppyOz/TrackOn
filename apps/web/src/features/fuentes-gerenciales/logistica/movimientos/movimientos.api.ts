import { api } from '../../../../shared/api'
import type { FiltrosMovimientos, Movimiento, MovimientoNuevo, Pagina, ReversionNueva } from './movimientos.types'

const base = '/api/fuentes-gerenciales/logistica/movimientos'
const query = (filters: FiltrosMovimientos) => {
  const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) })
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.articuloId) params.set('articuloId', String(filters.articuloId))
  return params.toString()
}
export const listarMovimientos = (filters: FiltrosMovimientos) => api<Pagina<Movimiento>>(`${base}?${query(filters)}`)
export const obtenerMovimiento = (id: number) => api<Movimiento>(`${base}/${id}`)
export const crearMovimiento = (payload: MovimientoNuevo, key: string) => api<Movimiento>(base, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
export const revertirMovimiento = (id: number, payload: ReversionNueva, key: string) => api<Movimiento>(`${base}/${id}/revertir`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
