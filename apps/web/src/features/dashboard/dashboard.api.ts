import { api } from '../../shared/api';
import type { OrdenResumen } from '../ordenes/ordenes.types';
type OrdenAtencion = Pick<
    OrdenResumen,
    'id' | 'numero' | 'clienteNombreRegistrado' | 'estadoCodigo' | 'fechaProgramada'
>;
export interface ResumenOperativo {
    finanzas?: { facturacion: string; cobros: string; porCobrar: string; vencido: string };
    stockCritico?: number;
    atrasadas?: number;
    actividadReciente?: {
        id: number;
        fecha: string;
        motivo: string | null;
        estadoNuevo: string;
        orden: { id: number; numero: string; clienteNombreRegistrado: string };
    }[];
    operacionHoy?: (OrdenAtencion & { solicitud: string; responsable: string })[];
    fecha: string;
    zonaHoraria: string;
    abiertas: number;
    pendientes: number;
    enProceso: number;
    enRevision: number;
    cerradas: number;
    programadasHoy: number;
    cerradasHoy: number;
    urgentes: number;
    porEstado: Record<string, number>;
    requierenAtencion: (OrdenAtencion & Pick<OrdenResumen, 'solicitud' | 'prioridad'>)[];
    proximas: OrdenAtencion[];
    cuadrillas: { id: number; nombre: string; ordenesActivas: number }[];
}
export function obtenerResumen(periodo: 'hoy' | 'semana' | 'mes' = 'mes') {
    return api<ResumenOperativo>(`/api/dashboard/resumen?periodo=${periodo}`);
}
