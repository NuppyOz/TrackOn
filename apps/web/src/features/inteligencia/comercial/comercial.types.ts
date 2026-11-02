import type { Tablero, Metrica } from '../contracts'
export type DesgloseComercial = Readonly<{
  tipo: 'COTIZACION' | 'VENTA' | 'CONTRATO'
  id: number
  clienteId: number
  referencia: string
  fecha: string
  total?: string
  estado?: string
}>
export type MetricaComercial = Metrica & { base?: { numerador: number | string; denominador: number | string } }
export type TableroComercial = Omit<Tablero, 'metricas' | 'desgloses'> & { metricas: MetricaComercial[]; desgloses: DesgloseComercial[] }
