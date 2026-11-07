import { api } from '../../shared/api';

export type TipoReporte = 'CLIENTES' | 'OPORTUNIDADES' | 'COTIZACIONES' | 'VENTAS' | 'ORDENES' | 'ASIGNACIONES' | 'EVIDENCIAS' | 'CAMBIOS_ESTADO';
export type Reporte = { id: number; tipo: TipoReporte; desde: string | null; hasta: string | null; filas: number; creadoEn: string };
export type PaginaReportes = { items: Reporte[]; total: number; pagina: number; limite: number };
export const generarReporte = (input: { tipo: TipoReporte; desde?: string; hasta?: string }) =>
  api<Reporte>('/api/insights/reportes', { method: 'POST', body: JSON.stringify(input) });
export const listarReportes = (pagina: number) => api<PaginaReportes>(`/api/insights/reportes?pagina=${pagina}`);
export const descargarReporte = (id: number) => api<Blob>(`/api/insights/reportes/${id}/archivo`, undefined, 'blob');
