import { api } from '../../shared/api'
import type { Equipo, EquipoFiltros, EquipoInput, Ubicacion } from './equipos.types'
import type { Pagina } from '../../shared/pagination'

export function listarUbicaciones() { return api<Ubicacion[]>('/api/equipos/ubicaciones') }
export function listarEquipos(filtros: EquipoFiltros) {
  const query = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => { if (valor) query.set(clave, valor) })
  return api<Pagina<Equipo>>(`/api/equipos?${query}`)
}
export function crearEquipo(datos: EquipoInput) {
  return api<Equipo>('/api/equipos', { method: 'POST', body: JSON.stringify(datos) })
}
export function editarEquipo(id: number, datos: EquipoInput) {
  return api<Equipo>(`/api/equipos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
}
export function cambiarEstadoEquipo(id: number, activo: boolean) {
  return api<Equipo>(`/api/equipos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) })
}
