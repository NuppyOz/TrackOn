import { api } from '../../../shared/api'

export type EtapaOportunidad = 'NUEVA' | 'CALIFICADA' | 'PROPUESTA' | 'GANADA' | 'PERDIDA'
export type Oportunidad = Readonly<{
  id: number; version: number; clienteId: number; clienteNombre: string; clienteActivo: boolean; nombre: string; etapa: EtapaOportunidad;
  valorEstimado: string | null; proximaActividad: string | null; nota: string | null; responsableId: number; responsableNombre: string;
  creadaEn: string; actualizadaEn: string; cotizaciones: Array<{ id: number; estado: string; total: string; ventaId: number | null }>
}>
export type OportunidadDraft = Readonly<{ clienteId: number; nombre: string; valorEstimado?: string; proximaActividad?: string; nota?: string }>
export type OportunidadPatch = Readonly<{ version: number; nombre?: string; etapa?: 'CALIFICADA' | 'PROPUESTA' | 'PERDIDA'; valorEstimado?: string | null; proximaActividad?: string | null; nota?: string | null }>
type Page = Readonly<{ items: Oportunidad[]; pagina: number; limite: number; hayMas: boolean; total?: number }>
const base = '/api/comercial/oportunidades'
const json = (value: unknown) => JSON.stringify(value)

export function listarOportunidades(filters: { clienteId?: number; q?: string; pagina?: number; limite?: number } = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) })
  return api<Page>(`${base}?${query}`)
}
export const crearOportunidad = (draft: OportunidadDraft) => api<Oportunidad>(base, { method: 'POST', body: json(draft) })
export const actualizarOportunidad = (id: number, draft: OportunidadPatch) => api<Oportunidad>(`${base}/${id}`, { method: 'PATCH', body: json(draft) })
