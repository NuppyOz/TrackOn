import { api } from '../../../../shared/api'
import type { CerrarCorrectiva, CorrectivaGerencial, FiltrosCorrectivas, PaginaCorrectivas } from './correctivas.types'
const base = '/api/fuentes-gerenciales/calidad/correctivas'
export function listarCorrectivas(filtros: FiltrosCorrectivas) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaCorrectivas>(`${base}?${params}`)
}
export const obtenerCorrectiva = (id: number) => api<CorrectivaGerencial>(`${base}/${id}`)
export const cerrarCorrectiva = (id: number, payload: CerrarCorrectiva, key: string) => api<CorrectivaGerencial>(`${base}/${id}/cerrar`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
