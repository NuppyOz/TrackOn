export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type AplicacionCobro = Readonly<{ id: number; comprobanteId: number; comprobanteReferencia: string; importe: string }>
export type Cobro = Readonly<{
  id: number; clienteId: number; clienteNombre: string; referencia: string; fechaEfectiva: string; importe: string
  revertidoEn: string | null; motivoReversion: string | null; registradoEn: string; observacion: string | null; version: number
  aplicaciones?: AplicacionCobro[]
}>
export type AplicacionCobroNueva = Readonly<{ comprobanteId: number; importe: string }>
export type CobroNuevo = Readonly<{ clienteId: number; referencia: string; fechaEfectiva: string; aplicaciones: AplicacionCobroNueva[]; observacion?: string }>
export type FiltrosCobros = Readonly<{ q?: string; pagina: number; limite: number }>
