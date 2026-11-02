export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type CategoriaCosto = 'MANO_OBRA' | 'MATERIAL' | 'TRANSPORTE' | 'OTRO'
export type Costo = Readonly<{
  id: number; referencia: string; fechaEfectiva: string; categoria: CategoriaCosto; importe: string; clienteId: number | null; clienteNombre: string | null
  ordenId: number | null; comprobanteId: number | null; comprobanteReferencia: string | null; revertidoEn: string | null; motivoReversion: string | null
  registradoEn: string; observacion: string | null; version: number
}>
export type CostoNuevo = Readonly<{ referencia: string; fechaEfectiva: string; categoria: CategoriaCosto; importe: string; clienteId?: number; ordenId?: number; comprobanteId?: number; observacion?: string }>
export type FiltrosCostos = Readonly<{ q?: string; clienteId?: number; pagina: number; limite: number }>
