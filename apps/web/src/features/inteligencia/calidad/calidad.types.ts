import type { Metrica, Tablero } from '../contracts'

export type DesgloseCalidad =
  | Readonly<{ tipo: 'GARANTIA'; id: number; referencia: string; clienteId: number; clienteNombre: string; activoReferencia: string; inicio: string; fin: string; vigente: boolean }>
  | Readonly<{ tipo: 'CASO'; id: number; referencia: string; clienteId: number; clienteNombre: string; activoReferencia: string; codigoFalla: string; abiertaEn: string; anteriorId: number | null; respondidaEn: string | null; resueltaEn: string | null; cerradaEn: string | null; respuestaLimiteEn: string | null; resolucionLimiteEn: string | null; estadoAlCorte: 'ABIERTO' | 'EN_ATENCION' | 'RESUELTO' | 'CERRADO'; respuestaEvaluable: boolean; respuestaCumple: boolean | null; resolucionEvaluable: boolean; resolucionCumple: boolean | null }>
  | Readonly<{ tipo: 'RETRABAJO'; id: number; casoId: number; casoReferencia: string; referenciaTrabajo: string; fechaEfectiva: string; ordenId: number | null }>
  | Readonly<{ tipo: 'CORRECTIVA'; id: number; casoId: number; casoReferencia: string; descripcion: string; responsableId: number; responsableNombre: string; creadaEn: string; venceEn: string; cerradaEn: string | null; abiertaAlCorte: boolean; vencidaAlCorte: boolean }>
  | Readonly<{ tipo: 'FALLA_REPETIDA'; clave: string; clienteId: number; activoReferencia: string; codigoFalla: string; cantidad: number; casoIds: number[] }>
export type MetricaCalidad = Metrica & Readonly<{ base?: { numerador: number; denominador: number } }>
export type TableroCalidad = Omit<Tablero, 'metricas' | 'desgloses'> & Readonly<{ metricas: MetricaCalidad[]; desgloses: DesgloseCalidad[] }>
export type TipoDesgloseCalidad = 'TODOS' | DesgloseCalidad['tipo']
