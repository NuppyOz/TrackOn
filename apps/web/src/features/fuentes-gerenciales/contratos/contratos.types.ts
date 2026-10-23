export type ContratoGerencial = Readonly<{
  id: number; clienteId: number; clienteNombre: string; referencia: string; inicio: string; fin: string; importe: string
  anteriorId: number | null; siguienteId: number | null; terminadoEn: string | null; registradoEn: string; observacion: string | null; version: number
}>
export type PaginaContratos = Readonly<{ items: ContratoGerencial[]; pagina: number; limite: number; hayMas: boolean }>
export type FiltrosContratos = Readonly<{ q?: string; clienteId?: number; pagina: number; limite: number }>
export type ContratoNuevo = Readonly<{ clienteId: number; referencia: string; inicio: string; fin: string; importe: string; observacion?: string }>
export type RenovacionContrato = Readonly<{ referencia: string; inicio: string; fin: string; importe: string; observacion?: string }>
