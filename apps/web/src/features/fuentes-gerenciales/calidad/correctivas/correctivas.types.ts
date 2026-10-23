export type EstadoCorrectiva = 'abiertas' | 'cerradas' | 'todas'
export type CorrectivaGerencial = Readonly<{
  id: number; casoId: number; casoReferencia: string; descripcion: string; responsableId: number; responsableNombre: string
  creadaEn: string; venceEn: string; cerradaEn: string | null; resultado: string | null; version: number
}>
export type PaginaCorrectivas = Readonly<{ items: CorrectivaGerencial[]; pagina: number; limite: number; hayMas: boolean }>
export type FiltrosCorrectivas = Readonly<{ q?: string; responsable?: number; casoId?: number; estado: EstadoCorrectiva; pagina: number; limite: number }>
export type CerrarCorrectiva = Readonly<{ version: number; cerradaEn: string; resultado: string }>
