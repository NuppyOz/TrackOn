import { ErrorDominioCotizacion } from './dinero.js';

export type EstadoCotizacionPersistido = 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';
export type EstadoCotizacion = EstadoCotizacionPersistido | 'VENCIDA';
export type DecisionCotizacion = 'APROBADA' | 'RECHAZADA';

export interface RelojCotizacion {
    ahora: () => Date;
}

const relojSistema: RelojCotizacion = { ahora: () => new Date() };

export function estadoEfectivoCotizacion(
    estadoPersistido: EstadoCotizacionPersistido,
    venceEn: Date | string,
    reloj: RelojCotizacion = relojSistema,
): EstadoCotizacion {
    if (estadoPersistido !== 'ENVIADA') return estadoPersistido;
    const vencimiento = venceEn instanceof Date ? venceEn : new Date(venceEn);
    if (!Number.isFinite(vencimiento.getTime())) throw new ErrorDominioCotizacion('Fecha de vencimiento inválida', 'FECHA_INVALIDA', 'venceEn');
    return reloj.ahora().getTime() >= vencimiento.getTime() ? 'VENCIDA' : 'ENVIADA';
}

export function enviarCotizacion(
    estadoPersistido: EstadoCotizacionPersistido,
    datos: { venceEn: Date | string; numeroLineas: number; clienteActivo: boolean },
    reloj: RelojCotizacion = relojSistema,
): { estadoPersistido: 'ENVIADA'; enviadaEn: Date } {
    if (estadoPersistido !== 'BORRADOR') {
        throw new ErrorDominioCotizacion('Solo se puede enviar una cotización en borrador', 'TRANSICION_INVALIDA', 'estado');
    }
    const ahora = reloj.ahora();
    const venceEn = datos.venceEn instanceof Date ? datos.venceEn : new Date(datos.venceEn);
    if (!Number.isFinite(venceEn.getTime())) throw new ErrorDominioCotizacion('Fecha de vencimiento inválida', 'FECHA_INVALIDA', 'venceEn');
    if (venceEn.getTime() <= ahora.getTime()) throw new ErrorDominioCotizacion('La fecha de vencimiento debe ser futura', 'VENCIMIENTO_NO_FUTURO', 'venceEn');
    if (!Number.isInteger(datos.numeroLineas) || datos.numeroLineas < 1 || datos.numeroLineas > 100) {
        throw new ErrorDominioCotizacion('Para enviar se requieren de 1 a 100 líneas', 'CANTIDAD_LINEAS_INVALIDA', 'lineas');
    }
    if (!datos.clienteActivo) throw new ErrorDominioCotizacion('El cliente debe estar activo para enviar', 'CLIENTE_INACTIVO', 'clienteId');
    return { estadoPersistido: 'ENVIADA', enviadaEn: ahora };
}

export function asegurarBorradorEditable(estadoPersistido: EstadoCotizacionPersistido): void {
    if (estadoPersistido !== 'BORRADOR') {
        throw new ErrorDominioCotizacion('Solo se puede editar una cotización en borrador', 'TRANSICION_INVALIDA', 'estado');
    }
}

export function decidirCotizacion(
    estadoPersistido: EstadoCotizacionPersistido,
    venceEn: Date | string,
    decision: DecisionCotizacion,
    reloj: RelojCotizacion = relojSistema,
): { estadoPersistido: DecisionCotizacion; decididaEn: Date } {
    const ahora = reloj.ahora();
    if (estadoPersistido === 'ENVIADA') {
        const vencimiento = venceEn instanceof Date ? venceEn : new Date(venceEn);
        if (!Number.isFinite(vencimiento.getTime())) throw new ErrorDominioCotizacion('Fecha de vencimiento inválida', 'FECHA_INVALIDA', 'venceEn');
        if (ahora.getTime() >= vencimiento.getTime()) {
            throw new ErrorDominioCotizacion('La cotización vencida no admite decisión', 'COTIZACION_VENCIDA', 'estado');
        }
    }
    if (estadoPersistido !== 'ENVIADA') {
        throw new ErrorDominioCotizacion('Solo se puede decidir una cotización enviada', 'TRANSICION_INVALIDA', 'estado');
    }
    return { estadoPersistido: decision, decididaEn: ahora };
}

export function accionesPermitidasCotizacion(
    estadoPersistido: EstadoCotizacionPersistido,
    venceEn: Date | string,
    reloj: RelojCotizacion = relojSistema,
): { editar: boolean; enviar: boolean; decidir: boolean } {
    const efectivo = estadoEfectivoCotizacion(estadoPersistido, venceEn, reloj);
    return { editar: estadoPersistido === 'BORRADOR', enviar: estadoPersistido === 'BORRADOR', decidir: efectivo === 'ENVIADA' };
}
