import { api } from '../../../../shared/api'
import type { CasoDetalle, CrearCaso, FiltrosCasos, PaginaCasos, ResponderCaso, ResolverCaso, CerrarCaso, CrearRetrabajo, CrearCorrectiva, RetrabajoCalidad, CorrectivaCalidad } from './casos.types'
const base = '/api/fuentes-gerenciales/calidad/casos'
export function listarCasos(filtros: FiltrosCasos) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaCasos>(`${base}?${params}`)
}
export const obtenerCaso = (id: number) => api<CasoDetalle>(`${base}/${id}`)
const nuevaClave = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
export const crearCaso = (payload: CrearCaso, key = nuevaClave()) => api<CasoDetalle>(base, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
function post<T>(path: string, payload: unknown, key: string) { return api<T>(`${base}${path}`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) }) }
export const responderCaso = (id: number, payload: ResponderCaso, key: string) => post<CasoDetalle>(`/${id}/responder`, payload, key)
export const resolverCaso = (id: number, payload: ResolverCaso, key: string) => post<CasoDetalle>(`/${id}/resolver`, payload, key)
export const cerrarCaso = (id: number, payload: CerrarCaso, key: string) => post<CasoDetalle>(`/${id}/cerrar`, payload, key)
export const crearRetrabajo = (id: number, payload: CrearRetrabajo, key: string) => post<RetrabajoCalidad>(`/${id}/retrabajos`, payload, key)
export const crearCorrectiva = (id: number, payload: CrearCorrectiva, key: string) => post<CorrectivaCalidad>(`/${id}/correctivas`, payload, key)
