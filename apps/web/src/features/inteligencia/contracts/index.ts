export type AreaInteligencia = 'COMERCIAL' | 'FINANCIERO' | 'LOGISTICO' | 'CALIDAD';
export type UnidadMetrica = 'cantidad' | 'NIO' | 'porcentaje' | 'veces';
export type EstadoMetrica = 'CALCULADO' | 'SIN_BASE_DE_CALCULO';
export type Metrica = { clave: string; valor: number | string | null; unidad: UnidadMetrica; estado: EstadoMetrica; fuentes: string[]; motivo: string | null };
export type EstadoCobertura = 'COMPLETA' | 'PARCIAL' | 'SIN_REGISTROS';
export type Cobertura = { estado: EstadoCobertura; desde: string | null; hastaVerificada: string | null; observaciones: string[] };
export type Tablero = {
  desde: string; hasta: string; corteEvaluacion: string; zonaHoraria: 'America/Managua'; cobertura: Cobertura;
  metricas: Metrica[]; desgloses: unknown[]; registrosSinAsignar: number;
};
export type SeccionInteligencia = 'comercial' | 'financiero' | 'logistico' | 'calidad';
export const seccionesInteligencia: ReadonlyArray<{ id: SeccionInteligencia; label: string }> = [
  { id: 'comercial', label: 'Comercial · H.5' }, { id: 'financiero', label: 'Financiero · H.6' },
  { id: 'logistico', label: 'Logístico · H.7' }, { id: 'calidad', label: 'Calidad · H.8' },
];
