import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';
import type { AsignarOrdenInput, EstadoOrden, FiltrosOrdenes, OrdenDetalle, OrdenNueva, OrdenResumen } from './ordenes.types';

export function listarOrdenes(filtros: FiltrosOrdenes) {
    const query = new URLSearchParams({ pagina: String(filtros.pagina), limite: String(filtros.limite) });
    if (filtros.estado) query.set('estado', filtros.estado);
    if (filtros.buscar.trim()) query.set('buscar', filtros.buscar.trim());
    return api<Pagina<OrdenResumen>>(`/api/ordenes?${query}`);
}

export function crearOrden(datos: OrdenNueva) {
    return api<OrdenDetalle>('/api/ordenes', { method: 'POST', body: JSON.stringify(datos) });
}

export function obtenerOrden(id: number) {
    return api<OrdenDetalle>(`/api/ordenes/${id}`);
}

export function cambiarEstadoOrden(id: number, estado: EstadoOrden, motivo: string) {
    return api<OrdenDetalle>(`/api/ordenes/${id}/estado`, {
        method: 'PATCH', body: JSON.stringify({ estado, motivo }),
    });
}

export function asignarOrden(id: number, datos: AsignarOrdenInput) {
    return api<OrdenDetalle>(`/api/ordenes/${id}/asignacion`, {
        method: 'POST', body: JSON.stringify(datos),
    });
}
