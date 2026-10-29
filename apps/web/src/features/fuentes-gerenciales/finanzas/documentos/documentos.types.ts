export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type ComprobanteLinea = Readonly<{ id: number; descripcion: string; importe: string; ordenId: number | null; conceptoId: number | null }>
export type AplicacionCobro = Readonly<{ id: number; cobroId: number; importe: string; fechaEfectiva: string; revertidoEn: string | null; referencia: string }>
export type Comprobante = Readonly<{
  id: number; clienteId: number; clienteNombre: string; referencia: string; emisor: string; emitidaEn: string; venceEn: string
  importeFinal: string; moneda: 'NIO'; anuladaEn: string | null; motivoAnulacion: string | null; registradoEn: string
  observacion: string | null; version: number; saldo: string; lineas?: ComprobanteLinea[]; aplicaciones?: AplicacionCobro[]
}>
export type ComprobanteNuevo = Readonly<{
  clienteId: number; referencia: string; emisor: string; emitidaEn: string; venceEn: string; importeFinal: string
  lineas: Array<{ descripcion: string; importe: string; ordenId?: number; conceptoId?: number }>; observacion?: string
}>
export type Filtros = Readonly<{ q?: string; clienteId?: number; pagina: number; limite: number }>
