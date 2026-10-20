import type { Metrica, Tablero } from '../contracts'

export type DesgloseFinanciero =
  | { tipo: 'COMPROBANTE'; id: number; referencia: string; clienteId: number; clienteNombre: string; fecha: string; venceEn: string | null; importe: string; saldo: string; anuladaEn: string | null; netoPeriodo: string }
  | { tipo: 'COBRO'; id: number; referencia: string; clienteId: number; clienteNombre: string; fecha: string; importe: string; revertidoEn: string | null; netoPeriodo: string }
  | { tipo: 'COSTO'; id: number; referencia: string; clienteId: number | null; clienteNombre: string | null; ordenId: number | null; comprobanteId: number | null; categoria: string; fecha: string; importe: string; revertidoEn: string | null; netoPeriodo: string }
  | { tipo: 'FACTURABLE'; id: number; referencia: string; clienteId: number; clienteNombre: string; conceptoId: number; conceptoNombre: string; unidad: string; fecha: string; cantidad: string; pendiente: string }
  | { tipo: 'RENTABILIDAD'; agrupacion: 'CLIENTE' | 'ORDEN'; id: number; referencia: string; ingresos: string; costos: string; resultado: string; margen: string | null }

export type MetricaFinanciera = Metrica & { base?: { numerador: string; denominador: string } }
export type TableroFinanciero = Omit<Tablero, 'metricas' | 'desgloses'> & { metricas: MetricaFinanciera[]; desgloses: DesgloseFinanciero[] }
