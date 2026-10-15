export interface EquipoDisponibleOrden {
    id: number;
    codigo: string;
    tipo: string;
    marca: string | null;
    modelo: string | null;
    numeroSerie: string | null;
    ubicacionId: number;
}

export interface RegistroEquipoOrden {
    id: number;
    ordenId: number;
    equipoId: number | null;
    tipoRegistrado: string | null;
    marcaRegistrada: string | null;
    modeloRegistrado: string | null;
    serieRegistrada: string | null;
    diagnostico: string | null;
    observaciones: string | null;
    resultado: string | null;
    creadaEn: string;
    actualizadaEn: string;
    equipo: EquipoDisponibleOrden | null;
}

export interface DiagnosticoOrdenInput {
    diagnostico: string;
    observaciones?: string | null;
    resultado?: string | null;
}
