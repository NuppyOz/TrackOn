export type PaginaVentas = Readonly<{ items: VentaResumen[]; pagina: number; limite: number; hayMas: boolean }>
export type VentaResumen = Readonly<{
  id: number
  cotizacionId: number
  clienteId: number
  clienteNombreRegistrado: string
  moneda: 'NIO'
  total: string
  confirmadaEn: string
}>
export type VentaDetalle = VentaResumen & Readonly<{
  confirmadaPor: Readonly<{ id: number; nombre: string }>
  lineas: Array<Readonly<{
    id: number; descripcion: string; tipo: string; unidad: string; cantidad: string
    precio: string; descuento: string; subtotal: string; total: string
  }>>
}>
export type FiltrosVentas = Readonly<{
  q?: string
  clienteId?: number
  pagina: number
  limite: number
  sortBy: 'id' | 'confirmadaEn'
  sortDir: 'asc' | 'desc'
}>
