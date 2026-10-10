import { api } from '../../shared/api';
import type {
    DiagnosticoOrdenInput,
    EquipoDisponibleOrden,
    RegistroEquipoOrden,
} from './ordenes.equipos.types';

export function listarEquiposOrden(ordenId: number) {
    return api<RegistroEquipoOrden[]>(`/api/ordenes/${ordenId}/equipos`);
}

export function listarEquiposDisponiblesOrden(ordenId: number) {
    return api<EquipoDisponibleOrden[]>(`/api/ordenes/${ordenId}/equipos-disponibles`);
}

export function vincularEquipoOrden(ordenId: number, equipoId: number) {
    return api<RegistroEquipoOrden>(`/api/ordenes/${ordenId}/equipos`, {
        method: 'POST', body: JSON.stringify({ equipoId }),
    });
}

export function guardarDiagnosticoOrden(ordenId: number, registroId: number, datos: DiagnosticoOrdenInput) {
    return api<RegistroEquipoOrden>(`/api/ordenes/${ordenId}/equipos/${registroId}/diagnostico`, {
        method: 'PATCH', body: JSON.stringify(datos),
    });
}
