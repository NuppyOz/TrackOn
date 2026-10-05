export interface EmpleadoCuadrilla {
  id: number
  codEmpleado: string
  active: boolean
  habilitadoComoTecnico: boolean
  persona: { firstName: string; secondName: string | null; firstLastName: string; secondLastName: string | null }
  usuario: { activo: boolean; rol: { cod: string; nombre: string } } | null
}

export interface MiembroCuadrilla {
  id: number
  empleadoId: number
  esLider: boolean
  inicio: string
  fin: string | null
  empleado: EmpleadoCuadrilla
}

export interface Cuadrilla {
  id: number
  nombre: string
  activa: boolean
  creadaEn: string
  miembros: MiembroCuadrilla[]
}

export interface CuadrillaInput { nombre: string; activa?: boolean }
export interface CuadrillaFiltros { estado: 'todos' | 'activas' | 'inactivas'; nombre: string }
