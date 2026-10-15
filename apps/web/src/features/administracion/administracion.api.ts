import { api } from '../../shared/api';
import type { Rol } from '../roles/roles.types';

export interface UsuarioAcceso {
    id: number; identificador: string; activo: boolean; rol: Rol;
    empleado: { id: number; codEmpleado: string; active: boolean; habilitadoComoTecnico: boolean;
        persona?: { firstName: string; firstLastName: string } };
}
export interface AccesoInput { identificador: string; rolId: number; empleadoId?: number; password?: string }
export const listarUsuarios = () => api<UsuarioAcceso[]>('/api/usuarios');
export const listarRolesAcceso = () => api<Rol[]>('/api/roles');
export function guardarAcceso(datos: AccesoInput, id?: number) {
    return api<UsuarioAcceso>(id ? `/api/usuarios/${id}` : '/api/usuarios', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(datos) });
}
export function cambiarEstadoAcceso(id: number, activo: boolean) {
    return api<UsuarioAcceso>(`/api/usuarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
}
