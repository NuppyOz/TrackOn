import { api } from '../../../../shared/api'
import type { DevolucionNueva, Herramienta, HerramientaNueva, HerramientaResumen, Pagina, PrestamoNuevo } from './herramientas.types'
const base = '/api/fuentes-gerenciales/logistica/herramientas'
export function listarHerramientas(q: string, pagina: number, limite: number) { const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) }); if (q.trim()) params.set('q', q.trim().slice(0, 100)); return api<Pagina<HerramientaResumen>>(`${base}?${params}`) }
export const obtenerHerramienta = (id: number) => api<Herramienta>(`${base}/${id}`)
export const crearHerramienta = (payload: HerramientaNueva, key: string) => api<Herramienta>(base, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
export const prestarHerramienta = (id: number, payload: PrestamoNuevo, key: string) => api<Herramienta>(`${base}/${id}/prestar`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
export const devolverPrestamoHerramienta = (id: number, payload: DevolucionNueva, key: string) => api<Herramienta>(`/api/fuentes-gerenciales/logistica/prestamos/${id}/devolver`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
