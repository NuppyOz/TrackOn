export type EstadoCaso = 'ABIERTO' | 'EN_ATENCION' | 'RESUELTO' | 'CERRADO'
export type ResultadoCaso = 'PROCEDE' | 'NO_PROCEDE' | null
export type CasoCalidad = Readonly<{
  id: number; referencia: string; clienteId: number; clienteNombre: string; activoReferencia: string; codigoFalla: string; descripcion: string
  equipoId: number | null; ordenId: number | null; garantiaId: number | null; garantiaReferencia: string | null; anteriorId: number | null
  abiertaEn: string; respuestaLimiteEn: string | null; resolucionLimiteEn: string | null; respondidaEn: string | null; resueltaEn: string | null
  cerradaEn: string | null; resultado: ResultadoCaso; causaRaiz: string | null; registradaEn: string; version: number; estado: EstadoCaso
}>
export type RetrabajoCalidad = Readonly<{ id: number; casoId: number; referenciaTrabajo: string; fechaEfectiva: string; motivo: string; ordenId: number | null; registradoEn: string }>
export type CorrectivaCalidad = Readonly<{ id: number; casoId: number; casoReferencia: string; descripcion: string; responsableId: number; responsableNombre: string; creadaEn: string; venceEn: string; cerradaEn: string | null; resultado: string | null; version: number }>
export type CasoDetalle = CasoCalidad & Readonly<{ retrabajos: readonly RetrabajoCalidad[]; correctivas: readonly CorrectivaCalidad[] }>
export type PaginaCasos = Readonly<{ items: CasoCalidad[]; pagina: number; limite: number; hayMas: boolean }>
export type FiltrosCasos = Readonly<{ q?: string; clienteId?: number; activoReferencia?: string; codigoFalla?: string; abiertaAntes?: string; estado?: EstadoCaso; pagina: number; limite: number }>
export type CrearCaso = Readonly<{
  referencia: string; clienteId: number; activoReferencia: string; codigoFalla: string; descripcion: string; equipoId?: number; ordenId?: number
  garantiaId?: number; anteriorId?: number; abiertaEn: string; respuestaLimiteEn?: string; resolucionLimiteEn?: string
}>
export type ResponderCaso = Readonly<{ version: number; respondidaEn: string }>
export type ResolverCaso = Readonly<{ version: number; resueltaEn: string; resultado: 'PROCEDE' | 'NO_PROCEDE'; causaRaiz: string }>
export type CerrarCaso = Readonly<{ version: number; cerradaEn: string }>
export type CrearRetrabajo = Readonly<{ referenciaTrabajo: string; fechaEfectiva: string; motivo: string; ordenId?: number }>
export type CrearCorrectiva = Readonly<{ descripcion: string; responsableId: number; creadaEn: string; venceEn: string }>
