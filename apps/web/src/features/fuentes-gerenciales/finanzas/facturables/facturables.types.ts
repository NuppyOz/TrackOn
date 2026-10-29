export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type AplicacionFacturable = Readonly<{ id: number; lineaComprobanteId: number; comprobanteId: number; comprobanteReferencia: string; cantidad: string; fechaEfectiva: string; comprobanteAnuladaEn: string | null }>
export type Facturable = Readonly<{
  id: number; clienteId: number; clienteNombre: string; conceptoId: number; conceptoNombre: string; unidad: string; cantidad: string; pendiente: string
  fechaEfectiva: string; referencia: string; ordenId: number | null; ventaId: number | null; lineaCotizacionId: number | null
  observacion: string | null; registradoEn: string; version: number; aplicaciones?: AplicacionFacturable[]
}>
export type FacturableNuevo = Readonly<{ clienteId: number; conceptoId: number; referencia: string; fechaEfectiva: string; cantidad: string; ordenId?: number; ventaId?: number; lineaCotizacionId?: number; observacion?: string }>
export type Filtros = Readonly<{ q?: string; clienteId?: number; pagina: number; limite: number }>
