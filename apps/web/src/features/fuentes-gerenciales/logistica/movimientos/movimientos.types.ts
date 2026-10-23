export type Pagina<T> = Readonly<{ items: T[]; pagina: number; limite: number; hayMas: boolean }>
export type TipoMovimiento = 'APERTURA' | 'ENTRADA' | 'CONSUMO' | 'DEVOLUCION' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'REVERSO'
export type Movimiento = Readonly<{
  id: number; articuloId: number; articuloCodigo: string; articuloNombre: string; unidad: string; tipo: TipoMovimiento; sentido: 1 | -1;
  cantidad: string; valor: string; saldoCantidad: string; saldoValor: string; referencia: string; fechaEfectiva: string; registradoEn: string;
  observacion: string | null; origenId: number | null; ordenId: number | null; puedeRevertir: boolean
}>
export type MovimientoNuevo = Readonly<{
  articuloId: number; tipo: Exclude<TipoMovimiento, 'APERTURA' | 'REVERSO'>; referencia: string; fechaEfectiva: string; cantidad: string;
  costoUnitario?: string; origenId?: number; ordenId?: number; observacion: string
}>
export type ReversionNueva = Readonly<{ referencia: string; fechaEfectiva: string; observacion: string }>
export type FiltrosMovimientos = Readonly<{ q?: string; articuloId?: number; pagina: number; limite: number }>
