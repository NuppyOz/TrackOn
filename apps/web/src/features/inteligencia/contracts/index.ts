export type AreaInteligencia = 'COMERCIAL' | 'FINANCIERO' | 'LOGISTICO' | 'CALIDAD';
export type UnidadMetrica = 'cantidad' | 'NIO' | 'porcentaje' | 'veces';
export type EstadoMetrica = 'CALCULADO' | 'SIN_BASE_DE_CALCULO';
export type Metrica = { clave: string; valor: number | string | null; unidad: UnidadMetrica; estado: EstadoMetrica; fuentes: string[]; motivo: string | null; base?: { numerador: number | string; denominador: number | string } };
export type EstadoCobertura = 'COMPLETA' | 'PARCIAL' | 'SIN_REGISTROS';
export type Cobertura = { estado: EstadoCobertura; desde: string | null; hastaVerificada: string | null; observaciones: string[] };
export type Tablero = {
  desde: string; hasta: string; corteEvaluacion: string; zonaHoraria: 'America/Managua'; cobertura: Cobertura;
  metricas: Metrica[]; desgloses: unknown[]; registrosSinAsignar: number;
};
export type SeccionInteligencia = 'comercial' | 'financiero' | 'logistico' | 'calidad';
export const seccionesInteligencia: ReadonlyArray<{ id: SeccionInteligencia; label: string }> = [
  { id: 'comercial', label: 'Indicadores comerciales' }, { id: 'financiero', label: 'Indicadores financieros' },
  { id: 'logistico', label: 'Indicadores logísticos' }, { id: 'calidad', label: 'Indicadores de calidad' },
];
