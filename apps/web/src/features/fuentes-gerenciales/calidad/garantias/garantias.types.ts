export type TipoGarantia = 'SERVICIO' | 'EQUIPO' | 'REPUESTO' | 'COMPONENTE'
export type EstadoGarantia = 'VIGENTE' | 'VENCIDA' | 'FUTURA'
export type GarantiaGerencial = Readonly<{
  id: number; referencia: string; clienteId: number; clienteNombre: string; tipo: TipoGarantia; activoReferencia: string
  equipoId: number | null; ordenId: number | null; inicio: string; fin: string; cobertura: string; exclusiones: string | null
  registradaEn: string; estado: EstadoGarantia
}>
export type PaginaGarantias = Readonly<{ items: GarantiaGerencial[]; pagina: number; limite: number; hayMas: boolean }>
export type FiltrosGarantias = Readonly<{ q?: string; clienteId?: number; activoReferencia?: string; pagina: number; limite: number }>
export type CrearGarantia = Readonly<{
  referencia: string; clienteId: number; tipo: TipoGarantia; activoReferencia: string; equipoId?: number; ordenId?: number
  inicio: string; fin: string; cobertura: string; exclusiones?: string
}>
