export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type EstadoHerramienta = 'DISPONIBLE' | 'PRESTADA'
export type PrestamoHerramienta = Readonly<{ id: number; herramientaId: number; empleadoId: number; empleadoNombre: string; prestadaEn: string; previstaEn: string; devueltaEn: string | null; referencia: string; observacion: string | null }>
export type HerramientaResumen = Readonly<{ id: number; codigo: string; nombre: string; creadaEn: string; estado: EstadoHerramienta }>
export type Herramienta = HerramientaResumen & Readonly<{ prestamos: PrestamoHerramienta[] }>
export type HerramientaNueva = Readonly<{ codigo: string; nombre: string }>
export type PrestamoNuevo = Readonly<{ empleadoId: number; referencia: string; prestadaEn: string; previstaEn: string; observacion?: string }>
export type DevolucionNueva = Readonly<{ devueltaEn: string; observacion?: string }>
