import { api } from '../../../shared/api'
import type { TableroLogistico } from './logistico.types'
export function consultarTableroLogistico(desde: string, hasta: string) {
  const params = new URLSearchParams({ desde, hasta })
  return api<TableroLogistico>(`/api/inteligencia/logistico?${params}`)
}
