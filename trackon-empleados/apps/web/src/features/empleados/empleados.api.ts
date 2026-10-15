import { api } from '../../shared/api';
import type { CrearEmpleado, EditarEmpleado, EmpleadoDetalle, EmpleadoResumen } from './empleados.types';

export function listarEmpleados() {
    return api<EmpleadoResumen[]>('/api/empleados');
}

export function obtenerEmpleado(id: number) {
    return api<EmpleadoDetalle>(`/api/empleados/${id}`);
}

export function crearEmpleado(datos: CrearEmpleado) {
    return api<EmpleadoDetalle>('/api/empleados', {
        method: 'POST', body: JSON.stringify(datos),
    });
}

export function editarEmpleado(id: number, datos: EditarEmpleado) {
    return api<EmpleadoDetalle>(`/api/empleados/${id}`, {
        method: 'PATCH', body: JSON.stringify(datos),
    });
}

export function cambiarEstadoEmpleado(id: number, active: boolean) {
    return api<EmpleadoDetalle>(`/api/empleados/${id}/estado`, {
        method: 'PATCH', body: JSON.stringify({ active }),
    });
}

export function cambiarHabilitacionTecnica(id: number, habilitadoComoTecnico: boolean) {
    return api<EmpleadoDetalle>(`/api/empleados/${id}/habilitacion-tecnica`, {
        method: 'PATCH', body: JSON.stringify({ habilitadoComoTecnico }),
    });
}
