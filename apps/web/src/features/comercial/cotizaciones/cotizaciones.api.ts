import { api } from '../../../shared/api'
import type { Cotizacion, CotizacionDraft, CotizacionPatch, CotizacionDecision, PaginaCotizaciones } from './cotizaciones.types'

const body = (value: unknown) => JSON.stringify(value)
const keyHeader = (key: string) => ({ 'Idempotency-Key': key })
const base = '/api/comercial/cotizaciones'

export function listarCotizaciones(filtros: { q?: string; estado?: string; clienteId?: number; pagina: number; limite: number; sortBy: 'id' | 'venceEn'; sortDir: 'asc' | 'desc' }) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaCotizaciones>(`${base}?${params}`)
}
export const obtenerCotizacion = (id: number) => api<Cotizacion>(`${base}/${id}`)
export const crearCotizacion = (draft: CotizacionDraft, key: string) => api<Cotizacion>(base, { method: 'POST', headers: keyHeader(key), body: body(draft) })
export const actualizarCotizacion = (id: number, patch: CotizacionPatch) => api<Cotizacion>(`${base}/${id}`, { method: 'PATCH', body: body(patch) })
export const enviarCotizacion = (id: number, version: number, key: string) => api<Cotizacion>(`${base}/${id}/enviar`, { method: 'POST', headers: keyHeader(key), body: body({ version }) })
export const decidirCotizacion = (id: number, value: CotizacionDecision, key: string) => api<Cotizacion>(`${base}/${id}/decision`, { method: 'POST', headers: keyHeader(key), body: body(value) })
export const agregarNotaCotizacion = (id: number, texto: string, key: string) => api<Cotizacion>(`${base}/${id}/notas`, { method: 'POST', headers: keyHeader(key), body: body({ texto }) })
