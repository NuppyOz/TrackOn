export type AreaCobertura = 'COMERCIAL' | 'FINANCIERO' | 'LOGISTICO' | 'CALIDAD'
export type CoberturaGerencial = Readonly<{
  area: AreaCobertura
  desde: string
  hastaVerificada: string
  responsable: { id: number; nombre: string }
  observacion: string | null
  version: number
}>
export type PaginaAuditoriaCobertura = Readonly<{
  items: ReadonlyArray<{ id: number; fecha: string; accion: string; responsable: { id: number; nombre: string } | null; anteriores: { area: AreaCobertura; desde: string; hastaVerificada: string; observacion: string | null; responsableId: number; version: number } | null; nuevos: { area: AreaCobertura; desde: string; hastaVerificada: string; observacion: string | null; responsableId: number; version: number } | null }>
  pagina: number
  limite: number
  hayMas: boolean
}>
