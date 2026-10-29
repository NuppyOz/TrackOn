import { api } from '../../../../shared/api'
import { createIdempotencyKey } from '../../../../shared/idempotency'
import type { Costo, CostoNuevo, FiltrosCostos, Pagina } from './costos.types'

const base = '/api/fuentes-gerenciales/finanzas/costos'
const query = (filters: FiltrosCostos) => { const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) }); if (filters.q) params.set('q', filters.q); if (filters.clienteId) params.set('clienteId', String(filters.clienteId)); return params.toString() }
export const listarCostos = (filters: FiltrosCostos) => api<Pagina<Costo>>(`${base}?${query(filters)}`)
export const obtenerCosto = (id: number) => api<Costo>(`${base}/${id}`)
const key = createIdempotencyKey
export const crearCosto = (payload: CostoNuevo, idempotencyKey: string = key()) => api<Costo>(base, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const revertirCosto = (id: number, payload: { version: number; fechaEfectiva: string; motivo: string }, idempotencyKey: string = key()) => api<Costo>(`${base}/${id}/revertir`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
