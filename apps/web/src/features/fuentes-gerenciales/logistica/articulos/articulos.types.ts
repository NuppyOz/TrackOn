export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type Articulo = Readonly<{
  id: number; codigo: string; nombre: string; unidad: string; minimo: string; saldoCantidad: string; saldoValor: string; costoPromedio: string | null;
  ultimaFecha: string; version: number; materialId: number | null; creadoEn: string
}>
export type AperturaArticulo = Readonly<{ referencia: string; fechaEfectiva: string; cantidad: string; costoUnitario: string; observacion: string }>
export type ArticuloNuevo = Readonly<{ codigo: string; nombre: string; unidad: string; minimo: string; materialId?: number; apertura: AperturaArticulo }>
export type FiltrosArticulos = Readonly<{ q?: string; pagina: number; limite: number }>
