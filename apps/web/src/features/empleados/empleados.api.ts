import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';
import type { CrearEmpleado, EditarEmpleado, EmpleadoDetalle, EmpleadoResumen, FiltrosEmpleados } from './empleados.types';

export interface PaginaEmpleados extends Pagina<EmpleadoResumen> {
    total: number;
    resumen: { total: number; activos: number; tecnicosHabilitados: number };
}

const filtrosIniciales: FiltrosEmpleados = {
    buscar: '', estado: 'todos', tecnico: 'todos', pagina: 1, limite: 25,
};

export function listarEmpleados(filtros: Partial<FiltrosEmpleados> = {}) {
    const valores = { ...filtrosIniciales, ...filtros };
    const query = new URLSearchParams({
        buscar: valores.buscar.trim(), estado: valores.estado, tecnico: valores.tecnico,
        pagina: String(valores.pagina), limite: String(valores.limite),
    });
    return api<PaginaEmpleados>(`/api/empleados?${query}`);
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
