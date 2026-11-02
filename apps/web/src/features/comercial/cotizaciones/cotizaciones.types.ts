export type PaginaCotizaciones = Readonly<{ items: CotizacionResumen[]; pagina: number; limite: number; hayMas: boolean }>
export type EstadoCotizacion = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA'
export type LineaCotizacionInput = Readonly<{ conceptoId: number; cantidad: string; descuento: string }>
export type CotizacionDraft = Readonly<{ clienteId: number; contactoId?: number; venceEn: string; lineas: LineaCotizacionInput[]; nota?: string }>
export type CotizacionPatch = Readonly<{ version: number; contactoId?: number | null; venceEn?: string; nota?: string | null; lineas?: LineaCotizacionInput[] }>
export type CotizacionDecision = Readonly<{ version: number; decision: 'APROBADA' | 'RECHAZADA'; comentario?: string }>
export type NotaCotizacion = Readonly<{ id: number; texto: string; autor: { id: number; nombre: string }; creadaEn: string }>
export type CotizacionResumen = Readonly<{ id: number; clienteId: number; clienteNombreRegistrado: string; clienteIdentificacionRegistrada: string | null; contactoId: number | null; estadoPersistido: EstadoCotizacion; estadoEfectivo: EstadoCotizacion; subtotal: string; descuento: string; total: string; moneda: 'NIO'; venceEn: string; version: number; creadaEn: string; actualizadaEn: string; enviadaEn: string | null; decididaEn: string | null; ventaId: number | null; accionesPermitidas: { editar: boolean; enviar: boolean; decidir: boolean; convertirVenta: boolean } }>
export type Cotizacion = CotizacionResumen & Readonly<{
  nota: string | null; creadaPorId: number; decisionOrigen: 'INTERNO' | 'PORTAL' | null; decisionComentario: string | null;
  lineas: Array<{ id: number; posicion: number; conceptoId: number; descripcion: string; tipo: string; unidad: string; cantidad: string; precio: string; descuento: string; subtotal: string; total: string }>;
  notas: NotaCotizacion[]; accionesPermitidas: { editar: boolean; enviar: boolean; decidir: boolean; convertirVenta: boolean }; ventaId: number | null;
}>
