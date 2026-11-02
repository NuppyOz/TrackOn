import { api } from '../../../shared/api'
import { createIdempotencyKey } from '../../../shared/idempotency'
import type { ContratoGerencial, ContratoNuevo, FiltrosContratos, PaginaContratos, RenovacionContrato } from './contratos.types'
const base = '/api/fuentes-gerenciales/contratos'
export const listarContratos = (filters: FiltrosContratos) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaContratos>(`${base}?${params}`)
}
export const obtenerContrato = (id: number) => api<ContratoGerencial>(`${base}/${id}`)
const key = createIdempotencyKey
export const crearContrato = (payload: ContratoNuevo, idempotencyKey = key()) => api<ContratoGerencial>(base, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const terminarContrato = (id: number, payload: { version: number; terminadoEn: string; motivo: string }, idempotencyKey = key()) => api<ContratoGerencial>(`${base}/${id}/terminar`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) })
export const renovarContrato = (id: number, version: number, payload: RenovacionContrato, idempotencyKey = key()) => api<ContratoGerencial>(`${base}/${id}/renovar`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ version, ...payload }) })
