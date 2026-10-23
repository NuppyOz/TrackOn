import { api } from '../../../shared/api'
import type { TableroFinanciero } from './financiero.types'

export function consultarTableroFinanciero(desde: string, hasta: string) {
  const params = new URLSearchParams({ desde, hasta })
  return api<TableroFinanciero>(`/api/inteligencia/financiero?${params}`)
}
