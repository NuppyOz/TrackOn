import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';

export interface Material { id: number; codigo: string; nombre: string; unidadMedida: string; activo: boolean }
export type MaterialInput = Pick<Material, 'codigo' | 'nombre' | 'unidadMedida'>;
export type EstadoMaterial = 'todos' | 'activos' | 'inactivos';
export function listarMateriales(estado: EstadoMaterial, buscar: string, pagina = 1, limite = 25) {
    const query = new URLSearchParams({ estado, buscar, pagina: String(pagina), limite: String(limite) });
    return api<Pagina<Material>>(`/api/materiales?${query}`);
}
export function crearMaterial(datos: MaterialInput) {
    return api<Material>('/api/materiales', { method: 'POST', body: JSON.stringify(datos) });
}
export function editarMaterial(id: number, datos: MaterialInput) {
    return api<Material>(`/api/materiales/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}
export function cambiarEstadoMaterial(id: number, activo: boolean) {
    return api<Material>(`/api/materiales/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
}
