import { api } from '../../../shared/api'
import type { TableroCalidad } from './calidad.types'

export function consultarTableroCalidad(desde: string, hasta: string) {
  const params = new URLSearchParams({ desde, hasta })
  return api<TableroCalidad>(`/api/inteligencia/calidad?${params}`)
}
