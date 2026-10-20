export type AreaAsistente = 'comercial' | 'financiero' | 'logistico' | 'calidad'

export interface DisponibilidadAsistente {
  disponible: boolean
}

export interface InterpretacionAsistente {
  texto: string
  snapshotId: string
  area: AreaAsistente
  desde: string
  hasta: string
  corte: string
  fuentes: string[]
  generadaEn: string
}

export interface EstadoAsistente {
  key: string
  interpretacion?: InterpretacionAsistente
  error?: string
  loading?: boolean
}
