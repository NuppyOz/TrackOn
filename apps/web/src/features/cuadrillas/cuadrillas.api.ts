import { api } from '../../shared/api'
import type { Cuadrilla, CuadrillaFiltros, CuadrillaInput, EmpleadoCuadrilla, MiembroCuadrilla } from './cuadrillas.types'
import type { Pagina } from '../../shared/pagination'

export function listarCuadrillas(filtros: CuadrillaFiltros) {
  const query = new URLSearchParams()
  if (filtros.estado) query.set('estado', filtros.estado)
  if (filtros.nombre) query.set('nombre', filtros.nombre)
  return api<Pagina<Cuadrilla>>(`/api/cuadrillas?${query}`)
}
export function listarEmpleadosElegibles() { return api<EmpleadoCuadrilla[]>('/api/cuadrillas/empleados-elegibles') }
export function crearCuadrilla(datos: CuadrillaInput) { return api<Cuadrilla>('/api/cuadrillas', { method: 'POST', body: JSON.stringify(datos) }) }
export function editarCuadrilla(id: number, datos: CuadrillaInput) { return api<Cuadrilla>(`/api/cuadrillas/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }) }
export function cambiarEstadoCuadrilla(id: number, activa: boolean) { return api<Cuadrilla>(`/api/cuadrillas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activa }) }) }
export function agregarMiembro(id: number, empleadoId: number) { return api<MiembroCuadrilla>(`/api/cuadrillas/${id}/miembros`, { method: 'POST', body: JSON.stringify({ empleadoId }) }) }
export function retirarMiembro(id: number, miembroId: number) { return api<MiembroCuadrilla>(`/api/cuadrillas/${id}/miembros/${miembroId}`, { method: 'DELETE' }) }
export function definirLider(id: number, empleadoId: number) { return api<Cuadrilla>(`/api/cuadrillas/${id}/lider`, { method: 'PATCH', body: JSON.stringify({ empleadoId }) }) }
