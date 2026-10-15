import { api } from '../../shared/api';
import type { OrdenResumen } from '../ordenes/ordenes.types';
type OrdenAtencion = Pick<OrdenResumen, 'id' | 'numero' | 'clienteNombreRegistrado' | 'estadoCodigo' | 'fechaProgramada'>;
export interface ResumenOperativo {
    fecha: string; zonaHoraria: string; abiertas: number; pendientes: number; enProceso: number; enRevision: number;
    cerradas: number; programadasHoy: number; cerradasHoy: number; urgentes: number;
    requierenAtencion: (OrdenAtencion & Pick<OrdenResumen, 'solicitud' | 'prioridad'>)[];
    proximas: OrdenAtencion[];
    cuadrillas: { id: number; nombre: string; ordenesActivas: number }[];
}
export function obtenerResumen() { return api<ResumenOperativo>('/api/dashboard/resumen'); }
