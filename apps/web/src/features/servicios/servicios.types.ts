export interface Servicio { id: number; codigo: string; nombre: string; descripcion: string | null; activo: boolean }
export interface ServicioInput { codigo: string; nombre: string; descripcion: string | null }
export type EstadoServicio = 'todos' | 'activos' | 'inactivos'
