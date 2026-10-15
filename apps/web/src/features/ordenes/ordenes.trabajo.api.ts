import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';
import type { Servicio } from '../servicios/servicios.types';
import type { Material } from '../materiales/materiales.api';

export interface ServicioRealizado { id: number; nombreRegistrado: string; cantidad: string; descripcionTrabajo: string }
export interface MaterialUtilizado { id: number; nombreRegistrado: string; unidadRegistrada: string; cantidad: string; observacion: string | null }
export interface TrabajoEquipo { servicios: ServicioRealizado[]; materiales: MaterialUtilizado[] }
const ruta = (ordenId: number, registroId: number) => `/api/ordenes/${ordenId}/equipos/${registroId}`;
export function listarTrabajo(ordenId: number, registroId: number) { return api<TrabajoEquipo>(`${ruta(ordenId, registroId)}/trabajo`); }
export function registrarServicio(ordenId: number, registroId: number, datos: { servicioId: number; cantidad: number; descripcionTrabajo: string }) {
    return api<ServicioRealizado>(`${ruta(ordenId, registroId)}/servicios`, { method: 'POST', body: JSON.stringify(datos) });
}
export function registrarMaterial(ordenId: number, registroId: number, datos: { materialId: number; cantidad: number; observacion: string | null }) {
    return api<MaterialUtilizado>(`${ruta(ordenId, registroId)}/materiales`, { method: 'POST', body: JSON.stringify(datos) });
}
export function buscarServicios(buscar: string) {
    return api<Pagina<Servicio>>(`/api/servicios?${new URLSearchParams({ estado: 'activos', buscar, limite: '100' })}`);
}
export function buscarMateriales(buscar: string) {
    return api<Pagina<Material>>(`/api/materiales?${new URLSearchParams({ estado: 'activos', buscar, limite: '100' })}`);
}
