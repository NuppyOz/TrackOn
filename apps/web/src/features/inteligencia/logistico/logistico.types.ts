import type { Tablero, Metrica } from '../contracts'
export type DesgloseLogistico =
  | Readonly<{ tipo: 'ARTICULO'; id: number; codigo: string; nombre: string; unidad: string; stock: string; minimo: string; valor: string; consumoNeto: string; stockMedio: string | null; rotacion: string | null; motivo: string | null }>
  | Readonly<{ tipo: 'COMPRA_LINEA'; id: number; compraId: number; compraReferencia: string; proveedor: string; articuloId: number; articuloCodigo: string; unidad: string; cantidad: string; recibido: string; cancelado: string; pendiente: string; prometidaEn: string }>
  | Readonly<{ tipo: 'RECEPCION'; id: number; referencia: string; compraId: number; compraReferencia: string; proveedor: string; articuloId: number; articuloCodigo: string; unidad: string; cantidad: string; fecha: string; prometidaEn: string; tardia: boolean }>
  | Readonly<{ tipo: 'HERRAMIENTA'; id: number; codigo: string; nombre: string; prestamoId: number; empleadoId: number; empleadoNombre: string; prestadaEn: string; previstaEn: string; vencida: boolean }>
export type TableroLogistico = Omit<Tablero, 'desgloses'> & Readonly<{ desgloses: DesgloseLogistico[]; metricas: Metrica[] }>
export type TipoDesgloseLogistico = 'TODOS' | DesgloseLogistico['tipo']
