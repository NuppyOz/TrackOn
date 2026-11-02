import { api } from '../../../../shared/api'
import type { Articulo, ArticuloNuevo, FiltrosArticulos, Pagina } from './articulos.types'

const base = '/api/fuentes-gerenciales/logistica'
const query = (filters: { q?: string; pagina: number; limite: number; articuloId?: number }) => {
  const params = new URLSearchParams({ pagina: String(filters.pagina), limite: String(filters.limite) })
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.articuloId) params.set('articuloId', String(filters.articuloId))
  return params.toString()
}
export const listarArticulos = (filters: FiltrosArticulos) => api<Pagina<Articulo>>(`${base}/articulos?${query(filters)}`)
export const obtenerArticulo = (id: number) => api<Articulo>(`${base}/articulos/${id}`)
export const crearArticulo = (payload: ArticuloNuevo, key: string) => api<Articulo>(`${base}/articulos`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
