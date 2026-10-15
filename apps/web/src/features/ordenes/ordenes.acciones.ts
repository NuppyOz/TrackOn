import type { EstadoOrden } from './ordenes.types';

export type AccionOrden = 'ver' | 'editar' | 'asignar' | 'desactivar';

export function permiteAccionOrden(estado: EstadoOrden, puedeGestionar: boolean, accion: AccionOrden) {
    if (accion === 'ver') return true;
    if (!puedeGestionar) return false;
    if (accion === 'asignar') return estado === 'PENDIENTE';
    return ['BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION'].includes(estado);
}
