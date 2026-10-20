import { api } from '../../../../shared/api'
import type { CrearGarantia, FiltrosGarantias, GarantiaGerencial, PaginaGarantias } from './garantias.types'
const base = '/api/fuentes-gerenciales/calidad/garantias'
export function listarGarantias(filtros: FiltrosGarantias) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaGarantias>(`${base}?${params}`)
}
export const obtenerGarantia = (id: number) => api<GarantiaGerencial>(`${base}/${id}`)
const nuevaClave = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
export const crearGarantia = (payload: CrearGarantia, key = nuevaClave()) => api<GarantiaGerencial>(base, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
