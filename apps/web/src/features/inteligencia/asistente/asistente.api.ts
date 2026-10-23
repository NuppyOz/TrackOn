import { api } from '../../../shared/api'
import type { AreaAsistente, DisponibilidadAsistente, InterpretacionAsistente } from './asistente.types'

export function consultarDisponibilidadAsistente(signal?: AbortSignal) {
  return api<DisponibilidadAsistente>('/api/inteligencia/asistente/disponibilidad', { signal })
}

export function solicitarInterpretacion(area: AreaAsistente, desde: string, hasta: string, signal?: AbortSignal) {
  return api<InterpretacionAsistente>('/api/inteligencia/asistente/explicar', {
    method: 'POST',
    body: JSON.stringify({ area, desde, hasta }),
    signal,
  })
}
