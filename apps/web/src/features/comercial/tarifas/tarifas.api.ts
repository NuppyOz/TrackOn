import { api } from '../../../shared/api'

export type EstadoCatalogo = 'activos' | 'inactivos' | 'todos'
export type TipoConcepto = 'SERVICIO' | 'MANO_OBRA' | 'EQUIPO' | 'REPUESTO' | 'INSUMO'
export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type ConceptoComercial = Readonly<{
  id: number; codigo: string; tipo: TipoConcepto; nombre: string; unidad: string; servicioId: number | null; materialId: number | null;
  activo: boolean; version: number; creadoEn: string; actualizadoEn: string
}>
export type ConceptoNuevo = Readonly<{ codigo: string; tipo: TipoConcepto; nombre: string; unidad: string; servicioId?: number | null; materialId?: number | null }>
export type ConceptoCambio = Readonly<{ version: number; nombre?: string; unidad?: string; activo?: boolean }>
export type TarifaComercial = Readonly<{
  id: number; conceptoId: number; clienteId: number | null; moneda: 'NIO'; precio: string; activo: boolean; version: number; creadaEn: string;
  concepto: Pick<ConceptoComercial, 'id' | 'codigo' | 'nombre' | 'unidad' | 'tipo'>
}>
export type TarifaNueva = Readonly<{ conceptoId: number; clienteId?: number | null; moneda?: 'NIO'; precio: string }>
export type PrecioResuelto = Readonly<{ tarifaId: number; conceptoId: number; clienteIdSolicitado: number; origen: 'CLIENTE' | 'ESTANDAR'; moneda: 'NIO'; precio: string }>
export type FiltrosConceptos = Readonly<{ q?: string; estado: EstadoCatalogo; pagina: number; limite: number; sortBy: 'codigo' | 'nombre' | 'creadoEn'; sortDir: 'asc' | 'desc' }>
export type FiltrosTarifas = Readonly<{ q?: string; conceptoId?: number; clienteId?: number; estado: EstadoCatalogo; pagina: number; limite: number; sortBy: 'id' | 'creadaEn'; sortDir: 'asc' | 'desc' }>

function query(params: Record<string, string | number | undefined>) {
  const url = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') url.set(key, String(value))
  return url.toString()
}

export function listarConceptos(filtros: FiltrosConceptos) {
  return api<Pagina<ConceptoComercial>>(`/api/comercial/conceptos?${query(filtros)}`)
}
export function crearConcepto(datos: ConceptoNuevo) {
  return api<ConceptoComercial>('/api/comercial/conceptos', { method: 'POST', body: JSON.stringify(datos) })
}
export function actualizarConcepto(id: number, datos: ConceptoCambio) {
  return api<ConceptoComercial>(`/api/comercial/conceptos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
}
export function listarTarifas(filtros: FiltrosTarifas) {
  return api<Pagina<TarifaComercial>>(`/api/comercial/tarifas?${query(filtros)}`)
}
export function crearTarifa(datos: TarifaNueva) {
  return api<TarifaComercial>('/api/comercial/tarifas', { method: 'POST', body: JSON.stringify(datos) })
}
export function cambiarEstadoTarifa(id: number, version: number, activo: boolean) {
  return api<TarifaComercial>(`/api/comercial/tarifas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ version, activo }) })
}
export function resolverPrecio(conceptoId: number, clienteId: number) {
  return api<PrecioResuelto>(`/api/comercial/tarifas/resolver?${query({ conceptoId, clienteId })}`)
}
