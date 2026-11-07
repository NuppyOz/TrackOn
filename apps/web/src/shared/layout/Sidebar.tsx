import {
    ActivityIcon,
    BuildingsIcon,
    CaretDownIcon,
    CubeIcon,
    GearSixIcon,
    SquaresFourIcon,
    ToolboxIcon,
    UsersIcon,
    ShieldCheckIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { RUTAS } from '../navigation';
export type Seccion =
    | 'agenda'
    | 'administracion'
    | 'auditoria'
    | 'dashboard'
    | 'materiales'
    | 'clientes'
    | 'empleados'
    | 'equipos'
    | 'servicios'
    | 'ordenes'
    | 'cuadrillas'
    | 'comercial'
    | 'inteligencia'
    | 'operaciones'
    | 'field';
interface SidebarProps {
    seccion: Seccion;
    onNavigate: (seccion: Seccion, ruta?: string) => void;
    abierto: boolean;
    puedeGestionarCuadrillas: boolean;
    puedeAdministrar?: boolean;
}
type Enlace = { id: Seccion; etiqueta: string; ruta?: string; /** Se despliegan cuando la ruta actual cuelga de `ruta`. */ hijos?: Enlace[] };
export function Sidebar({
    seccion,
    onNavigate,
    abierto,
    puedeGestionarCuadrillas,
    puedeAdministrar = false,
}: Readonly<SidebarProps>) {
    function enlaces(items: Enlace[], nivel = 0): React.ReactNode[] {
        return items.flatMap((item) => {
            const path = window.location.pathname;
            const desplegado = Boolean(item.hijos && item.ruta && (path === item.ruta || path.startsWith(`${item.ruta}/`)));
            const activo = item.ruta
                ? path === item.ruta || desplegado
                    || (item.ruta === RUTAS.dashboard && path === RUTAS.insights.inicio)
                    || (item.ruta === RUTAS.insights.reportes && path === RUTAS.insights.historial)
                    || (item.ruta === RUTAS.comercial.crm && path === RUTAS.comercial.inicio)
                    || (item.ruta === RUTAS.inteligencia.operacion.resumen && path === RUTAS.inteligencia.inicio)
                : seccion === item.id;
            const boton = <button
                key={item.ruta ?? item.id}
                type="button"
                className={`figma-nav-link ${nivel ? 'figma-nav-sublink' : ''} ${activo ? 'selected' : ''}`}
                aria-current={activo && !desplegado ? 'page' : undefined}
                aria-expanded={item.hijos ? desplegado : undefined}
                onClick={() => item.ruta ? onNavigate(item.id, item.ruta) : onNavigate(item.id)}
            >
                {item.etiqueta}
            </button>;
            return desplegado && item.hijos ? [boton, <div key={`${item.ruta}-hijos`} className="figma-nav-children">{enlaces(item.hijos, nivel + 1)}</div>] : [boton];
        });
    }
    function grupo(titulo: string, icono: Icon, items: Enlace[]) {
        const Icono = icono;
        const activo = items.some((item) => item.id === seccion || Boolean(item.ruta && (
            window.location.pathname === item.ruta
            || window.location.pathname.startsWith(`${item.ruta}/`)
            || (item.ruta === RUTAS.comercial.crm && window.location.pathname === RUTAS.comercial.inicio)
            || (item.ruta === RUTAS.inteligencia.operacion.resumen && window.location.pathname === RUTAS.inteligencia.inicio)
        )));
        return (
            <details className="erp-nav-group" key={titulo} open={activo || undefined}>
                <summary>
                    <Icono size={20} aria-hidden="true" />
                    <span>{titulo}</span>
                    <CaretDownIcon className="erp-nav-caret" size={14} aria-hidden="true" />
                </summary>
                <nav aria-label={titulo}>{enlaces(items)}</nav>
            </details>
        );
    }
    return (
        <aside className={`sidebar figma-sidebar ${abierto ? 'sidebar--open' : ''}`}>
            <a
                className="erp-sidebar-brand"
                href={puedeGestionarCuadrillas ? RUTAS.dashboard : RUTAS.field.misOrdenes}
                onClick={(e) => {
                    e.preventDefault();
                    onNavigate(puedeGestionarCuadrillas ? 'dashboard' : 'field');
                }}
            >
                <img src="/logo-multicas.png" alt="MULTICAS" />
                <span>
                    <strong>MultiCore ERP</strong>
                    <small>by MULTICAS</small>
                </span>
            </a>
            <div className="erp-sidebar-scroll">
                {puedeGestionarCuadrillas && grupo('Análisis', SquaresFourIcon, [
                    { id: 'dashboard', etiqueta: 'Dashboards', ruta: RUTAS.dashboard },
                    { id: 'dashboard', etiqueta: 'Reportes', ruta: RUTAS.insights.reportes },
                ])}
                {puedeGestionarCuadrillas &&
                    grupo(
                        'Comercial',
                        UsersIcon,
                        [
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'CRM',
                                ruta: RUTAS.comercial.crm,
                                hijos: [
                                    { id: 'comercial' as Seccion, etiqueta: 'Contactos', ruta: RUTAS.comercial['crm-contactos'] },
                                    { id: 'comercial' as Seccion, etiqueta: 'Ubicaciones y sucursales', ruta: RUTAS.comercial['crm-ubicaciones'] },
                                ],
                            },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Gestión de ventas',
                                ruta: RUTAS.comercial.ventas,
                                hijos: [
                                    { id: 'comercial' as Seccion, etiqueta: 'Oportunidades', ruta: RUTAS.comercial['ventas-oportunidades'] },
                                    { id: 'comercial' as Seccion, etiqueta: 'Cotizaciones', ruta: RUTAS.comercial['ventas-cotizaciones'] },
                                    { id: 'comercial' as Seccion, etiqueta: 'Ventas registradas', ruta: RUTAS.comercial['ventas-registradas'] },
                                ],
                            },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Catálogo comercial',
                                ruta: RUTAS.comercial.catalogo,
                                hijos: [
                                    { id: 'comercial' as Seccion, etiqueta: 'Conceptos', ruta: RUTAS.comercial['catalogo-conceptos'] },
                                    { id: 'comercial' as Seccion, etiqueta: 'Tarifas', ruta: RUTAS.comercial['catalogo-tarifas'] },
                                ],
                            },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Accesos de clientes',
                                ruta: RUTAS.comercial['portal-cuentas'],
                            },
                        ].filter((item) => puedeAdministrar || item.ruta !== RUTAS.comercial['portal-cuentas']),
                    )}
                {grupo('Operaciones', ToolboxIcon, [
                    ...(puedeGestionarCuadrillas
                        ? [{
                            id: 'operaciones' as Seccion,
                            etiqueta: 'Gestión de operaciones',
                            ruta: RUTAS.operaciones.inicio,
                            hijos: [
                                { id: 'operaciones' as Seccion, etiqueta: 'Solicitudes', ruta: RUTAS.operaciones.solicitudes },
                                { id: 'operaciones' as Seccion, etiqueta: 'Despacho y asignación', ruta: RUTAS.operaciones.despacho },
                                { id: 'operaciones' as Seccion, etiqueta: 'Diagnóstico', ruta: RUTAS.operaciones.diagnostico },
                                { id: 'operaciones' as Seccion, etiqueta: 'Ejecución', ruta: RUTAS.operaciones.ejecucion },
                                { id: 'operaciones' as Seccion, etiqueta: 'Evidencias', ruta: RUTAS.operaciones.evidencias },
                                { id: 'operaciones' as Seccion, etiqueta: 'Tipos de servicio', ruta: RUTAS.operaciones.tiposServicio },
                            ],
                        }]
                        : []),
                    { id: 'ordenes', etiqueta: 'Órdenes' },
                    { id: 'agenda', etiqueta: 'Agenda' },
                    { id: 'field', etiqueta: 'MultiCore ERP Field' },
                ])}
                {!puedeGestionarCuadrillas &&
                    grupo('Clientes', UsersIcon, [{ id: 'clientes', etiqueta: 'Directorio' }])}
                {grupo('Activos', GearSixIcon, [
                    { id: 'equipos', etiqueta: 'Equipos' },
                ])}
                {grupo('Inventario', CubeIcon, [
                    { id: 'materiales', etiqueta: 'Materiales' },
                ])}
                {puedeGestionarCuadrillas &&
                    grupo('Personal', BuildingsIcon, [
                        { id: 'empleados', etiqueta: 'Empleados' },
                        { id: 'cuadrillas', etiqueta: 'Cuadrillas' },
                    ])}
                {grupo('Configuración', ShieldCheckIcon, [
                    { id: 'servicios', etiqueta: 'Tipos de servicio' },
                    ...(puedeAdministrar ? [
                        { id: 'administracion' as Seccion, etiqueta: 'Usuarios y permisos' },
                        { id: 'auditoria' as Seccion, etiqueta: 'Auditoría' },
                    ] : []),
                ])}
                {puedeGestionarCuadrillas &&
                    grupo('Inteligencia', ActivityIcon, [
                        {
                            id: 'inteligencia',
                            etiqueta: 'IA y negocio',
                            ruta: RUTAS.inteligencia.operacion.resumen,
                        },
                    ])}
            </div>
        </aside>
    );
}
