export type EstadoOrden = 'BORRADOR' | 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' |
    'EN_REVISION' | 'CERRADA' | 'CANCELADA';

export type PrioridadOrden = 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface AsignacionResumen {
    id: number;
    inicio: string;
    motivo: string;
    cuadrilla: { id: number; nombre: string } | null;
    empleadoResponsable: { id: number; persona: { firstName: string; firstLastName: string } } | null;
}

export interface AsignarOrdenInput {
    cuadrillaId: number;
    motivo: string;
    fechaProgramada?: string;
}

export interface OrdenResumen {
    id: number;
    numero: string;
    ubicacionId: number;
    estadoCodigo: EstadoOrden;
    solicitud: string;
    prioridad: PrioridadOrden;
    fechaProgramada: string | null;
    creadaEn: string;
    actualizadaEn: string;
    cerradaEn: string | null;
    version: number;
    clienteNombreRegistrado: string;
    ubicacionNombreRegistrado: string;
    direccionRegistrada: string;
    asignaciones?: AsignacionResumen[];
}

export interface OrdenDetalle extends OrdenResumen {
    clienteIdentificacionRegistrada: string | null;
    creadaPor: { id: number; identificador: string };
    historial: Array<{
        id: number;
        estadoAnterior: string | null;
        estadoNuevo: string;
        motivo: string | null;
        fecha: string;
    }>;
}

export interface OrdenNueva {
    ubicacionId: number;
    solicitud: string;
    prioridad: PrioridadOrden;
    fechaProgramada?: string | null;
}

export interface FiltrosOrdenes {
    estado: EstadoOrden | '';
    buscar: string;
    pagina: number;
    limite: number;
}
