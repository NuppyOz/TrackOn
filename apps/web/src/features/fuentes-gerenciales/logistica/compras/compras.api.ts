import { api } from '../../../../shared/api'
import type { CancelacionNueva, Compra, CompraNueva, CompraResumen, Pagina, RecepcionNueva } from './compras.types'

const base = '/api/fuentes-gerenciales/logistica/compras'
export function listarCompras(q: string, pagina: number, limite: number) {
  const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) })
  if (q.trim()) params.set('q', q.trim().slice(0, 100))
  return api<Pagina<CompraResumen>>(`${base}?${params}`)
}
export const obtenerCompra = (id: number) => api<Compra>(`${base}/${id}`)
export const crearCompra = (payload: CompraNueva, key: string) => api<Compra>(base, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
export const recibirLineaCompra = (id: number, payload: RecepcionNueva, key: string) => api<Compra>(`${base}/lineas/${id}/recibir`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
export const cancelarPendienteCompra = (id: number, payload: CancelacionNueva, key: string) => api<Compra>(`${base}/lineas/${id}/cancelar-pendiente`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(payload) })
