import { api } from '../../../../shared/api'
import { createIdempotencyKey } from '../../../../shared/idempotency'
import type { Facturable, FacturableNuevo, Filtros, Pagina } from './facturables.types'

const base = '/api/fuentes-gerenciales/finanzas/facturables'
const query = (filters: Filtros) => {
  const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) })
  if (filters.q) params.set('q', filters.q)
  if (filters.clienteId) params.set('clienteId', String(filters.clienteId))
  return params.toString()
}
export const listarFacturables = (filters: Filtros) => api<Pagina<Facturable>>(`${base}?${query(filters)}`)
export const obtenerFacturable = (id: number) => api<Facturable>(`${base}/${id}`)
const key = createIdempotencyKey
export const crearFacturable = (payload: FacturableNuevo, idempotencyKey: string = key()) => api<Facturable>(base, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const aplicarFacturable = (id: number, payload: { lineaComprobanteId: number; cantidad: string; fechaEfectiva: string }, idempotencyKey: string = key()) => api<Facturable>(`${base}/${id}/aplicar`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
