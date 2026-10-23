import { api } from '../../../shared/api'
import type { TableroComercial } from './comercial.types'
export function consultarTableroComercial(desde: string, hasta: string) {
  const params = new URLSearchParams({ desde, hasta })
  return api<TableroComercial>(`/api/inteligencia/comercial?${params}`)
}
