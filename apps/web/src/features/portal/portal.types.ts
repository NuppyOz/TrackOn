export interface PortalSesion {
    cuenta: { id: number; identificador: string };
    cliente: { id: number; nombre: string };
}
export type EstadoCotizacion = "ENVIADA" | "APROBADA" | "RECHAZADA" | "VENCIDA";
export interface CotizacionLista {
    id: number; version: number; estadoPersistido: string; estadoEfectivo: EstadoCotizacion;
    moneda: string; total: string; venceEn: string; enviadaEn: string | null; decididaEn: string | null;
    accionesPermitidas: { decidir: boolean };
}
export interface PaginaCotizaciones { items: CotizacionLista[]; pagina: number; limite: number; hayMas: boolean }
export interface CotizacionDetalle extends CotizacionLista {
    subtotal: string; descuento: string; decisionComentario: string | null;
    lineas: Array<{ id: number; posicion: number; descripcion: string; unidad: string; cantidad: string; precio: string; descuento: string; subtotal: string; total: string }>;
}
