import { api } from '../../shared/api'
import type { EstadoServicio, Servicio, ServicioInput } from './servicios.types'
import type { Pagina } from '../../shared/pagination'

export function listarServicios(estado: EstadoServicio, buscar: string, pagina = 1, limite = 25) {
  const query = new URLSearchParams({ estado })
  if (buscar) query.set('buscar', buscar)
  if (pagina !== 1) query.set('pagina', String(pagina))
  if (limite !== 25) query.set('limite', String(limite))
  return api<Pagina<Servicio>>(`/api/servicios?${query}`)
}
export function crearServicio(datos: ServicioInput) { return api<Servicio>('/api/servicios', { method: 'POST', body: JSON.stringify(datos) }) }
export function editarServicio(id: number, datos: ServicioInput) { return api<Servicio>(`/api/servicios/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }) }
export function cambiarEstadoServicio(id: number, activo: boolean) { return api<Servicio>(`/api/servicios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }) }
