import { api } from '../../../shared/api'
import type { FiltrosVentas, PaginaVentas, VentaDetalle, VentaResumen } from './ventas.types'

const base = '/api/comercial/ventas'
export function listarVentas(filtros: FiltrosVentas) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) if (value !== undefined && value !== '') params.set(key, String(value))
  return api<PaginaVentas>(`${base}?${params}`)
}
export function obtenerVenta(id: number) {
  return api<VentaDetalle>(`${base}/${id}`)
}
export function convertirCotizacionEnVenta(id: number, version: number, key: string) {
  return api<VentaResumen>(`/api/comercial/cotizaciones/${id}/convertir-venta`, {
    method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify({ version }),
  })
}
