import type { Seccion } from './layout/Sidebar';

const secciones: Seccion[] = ['agenda', 'administracion', 'auditoria', 'dashboard', 'operacion', 'ordenes', 'equipos', 'clientes', 'empleados', 'cuadrillas', 'servicios', 'materiales', 'comercial', 'inteligencia', 'operaciones', 'field'];

/** Área de inteligencia a la que pertenecía cada bloque de registros de origen. */
const areaDeOrigen: Record<string, string> = {
    contratos: 'comercial',
    finanzas: 'financiero',
    logistica: 'logistico',
    calidad: 'calidad',
};

/** La consulta dice qué fuente estaba abierta; si no, la primera de cada área. */
const fuentePorParametro: Array<[string, string]> = [
    ['contratoId', 'contratos'],
    ['comprobanteId', 'comprobantes'],
    ['cobroId', 'cobros'],
    ['costoId', 'costos'],
    ['facturableId', 'servicios'],
    ['articuloId', 'articulos'],
    ['movimientoId', 'movimientos'],
    ['compraId', 'compras'],
    ['herramientaId', 'herramientas'],
    ['garantiaId', 'garantias'],
    ['casoId', 'casos'],
    ['correctivaId', 'correctivas'],
];
const fuenteInicial: Record<string, string> = {
    comercial: 'contratos',
    financiero: 'comprobantes',
    logistico: 'articulos',
    calidad: 'garantias',
};

/**
 * Traduce una ruta vieja a su ruta canónica conservando la consulta.
 * Devuelve null cuando la ruta ya es canónica.
 *
 * El plan de navegación deja una sola dirección por destino: el área se elige
 * en el menú y los registros son la segunda vista del área. Las rutas de
 * /inteligencia/origen/* se mantienen como redirección para no romper los
 * enlaces guardados ni los que todavía no se migraron.
 */
export function rutaCanonica(pathname: string, search: string): string | null {
    const segmentos = pathname.split('/').filter(Boolean);
    if (segmentos[0] !== 'inteligencia') return null;
    const parametros = new URLSearchParams(search);

    if (segmentos[1] === 'operacion') {
        return `/operacion/${segmentos[2] ?? 'resumen'}${search}`;
    }

    if (segmentos[1] === 'origen') {
        const area = areaDeOrigen[segmentos[2] ?? ''] ?? 'comercial';
        const fuente = fuentePorParametro.find(([parametro]) => parametros.has(parametro))?.[1] ?? fuenteInicial[area];
        parametros.set('fuente', fuente);
        return `/inteligencia/${area}/registros?${parametros.toString()}`;
    }

    if (!segmentos[1]) return `/inteligencia/comercial${search}`;
    return null;
}

export function leerRuta() {
    const canonica = rutaCanonica(window.location.pathname, window.location.search);
    if (canonica) window.history.replaceState(null, '', canonica);
    const [seccion, detalle] = window.location.pathname.split('/').filter(Boolean);
    const destino = secciones.find(item => item === seccion) ?? 'dashboard';
    return {
        seccion: destino,
        ordenId: destino === 'ordenes' && /^[1-9]\d*$/.test(detalle ?? '') ? Number(detalle) : undefined,
        ordenNueva: destino === 'ordenes' && detalle === 'nueva',
        ruta: window.location.pathname,
    };
}

export function irA(ruta: string) {
    const actual = `${window.location.pathname}${window.location.search}`;
    if (actual === ruta) return;
    window.history.pushState(null, '', ruta);
    window.dispatchEvent(new Event('trackon:navigate'));
}
