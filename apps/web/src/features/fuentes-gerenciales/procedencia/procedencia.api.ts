import { api } from '../../../shared/api'
import type { AreaCobertura, CoberturaGerencial, PaginaAuditoriaCobertura } from './procedencia.types'

const base = '/api/fuentes-gerenciales/cobertura'
export const listarCoberturas = () => api<CoberturaGerencial[]>(base)
export const guardarCobertura = (area: AreaCobertura, payload: { version: number; desde: string; hastaVerificada: string; observacion?: string }) =>
  api<CoberturaGerencial>(`${base}/${area}`, { method: 'PUT', body: JSON.stringify(payload) })
export const historialCobertura = (area: AreaCobertura, pagina: number, limite = 10) => {
  const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) })
  return api<PaginaAuditoriaCobertura>(`${base}/${area}/historial?${params}`)
}
