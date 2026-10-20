import { api } from '../../../../shared/api'
import type { Cobro, CobroNuevo, FiltrosCobros, Pagina } from './cobros.types'

const base = '/api/fuentes-gerenciales/finanzas/cobros'
const query = (filters: FiltrosCobros) => { const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) }); if (filters.q) params.set('q', filters.q); return params.toString() }
export const listarCobros = (filters: FiltrosCobros) => api<Pagina<Cobro>>(`${base}?${query(filters)}`)
export const obtenerCobro = (id: number) => api<Cobro>(`${base}/${id}`)
const key = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
export const crearCobro = (payload: CobroNuevo, idempotencyKey: string = key()) => api<Cobro>(base, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const revertirCobro = (id: number, payload: { version: number; fechaEfectiva: string; motivo: string }, idempotencyKey: string = key()) => api<Cobro>(`${base}/${id}/revertir`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
