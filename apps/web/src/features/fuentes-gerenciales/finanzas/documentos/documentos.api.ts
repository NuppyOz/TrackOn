import { api } from '../../../../shared/api'
import type { Comprobante, ComprobanteNuevo, Filtros, Pagina } from './documentos.types'

const base = '/api/fuentes-gerenciales/finanzas/comprobantes'
const query = (filters: Filtros) => {
  const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) })
  if (filters.q) params.set('q', filters.q)
  if (filters.clienteId) params.set('clienteId', String(filters.clienteId))
  return params.toString()
}
export const listarComprobantes = (filters: Filtros) => api<Pagina<Comprobante>>(`${base}?${query(filters)}`)
export const obtenerComprobante = (id: number) => api<Comprobante>(`${base}/${id}`)
const key = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
export const crearComprobante = (payload: ComprobanteNuevo, idempotencyKey: string = key()) => api<Comprobante>(base, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const anularComprobante = (id: number, payload: { version: number; fechaEfectiva: string; motivo: string }, idempotencyKey: string = key()) => api<Comprobante>(`${base}/${id}/anular`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
