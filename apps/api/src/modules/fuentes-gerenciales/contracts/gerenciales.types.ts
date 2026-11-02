export type AreaCobertura = 'COMERCIAL' | 'FINANCIERO' | 'LOGISTICO' | 'CALIDAD';
export type CrearContratoGerencial = { clienteId: number; referencia: string; inicio: string; fin: string; importe: string; observacion?: string };
export type TerminarContratoGerencial = { version: number; terminadoEn: string; motivo: string };
export type RenovarContratoGerencial = { version: number; referencia: string; inicio: string; fin: string; importe: string; observacion?: string };
export type ListarContratosGerenciales = { q?: string; clienteId?: number; pagina: number; limite: number };
