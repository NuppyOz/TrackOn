export interface ClienteResumen {
  id: number
  codigo: string
  activo?: boolean
  persona: { firstName: string; firstLastName: string } | null
  organizacion: { razonSocial: string; nombreComercial: string | null } | null
}
export interface Ubicacion {
  id: number
  nombre: string
  direccion: string
  activa?: boolean
  cliente: ClienteResumen
}
export interface Equipo {
  id: number
  codigo: string
  tipo: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
  activo: boolean
  ubicacion: Ubicacion
}
export interface EquipoInput {
  ubicacionId: number
  codigo: string
  tipo: string
  marca: string | null
  modelo: string | null
  numeroSerie: string | null
}
export interface EquipoFiltros {
  clienteId: string
  ubicacionId: string
  codigo: string
  numeroSerie: string
  estado: 'todos' | 'activos' | 'inactivos'
  pagina?: number
  limite?: number
}
