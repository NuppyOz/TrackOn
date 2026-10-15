import type { Seccion } from './layout/Sidebar';

const secciones: Seccion[] = ['agenda', 'administracion', 'auditoria', 'dashboard', 'ordenes', 'equipos', 'clientes', 'empleados', 'cuadrillas', 'servicios', 'materiales'];
export function leerRuta() {
    const [seccion, detalle] = window.location.pathname.split('/').filter(Boolean);
    const destino = secciones.find(item => item === seccion) ?? 'equipos';
    return { seccion: destino, ordenId: destino === 'ordenes' && /^[1-9]\d*$/.test(detalle ?? '') ? Number(detalle) : undefined,
        ordenNueva: destino === 'ordenes' && detalle === 'nueva', ruta: window.location.pathname };
}
export function irA(ruta: string) {
    if (window.location.pathname === ruta) return;
    window.history.pushState(null, '', ruta);
    window.dispatchEvent(new Event('trackon:navigate'));
}
