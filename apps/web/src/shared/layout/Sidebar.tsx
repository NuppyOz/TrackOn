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
import { irA } from '../navigation';
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
    onNavigate: (seccion: Seccion) => void;
    abierto: boolean;
    puedeGestionarCuadrillas: boolean;
    puedeAdministrar?: boolean;
}
type Enlace = { id: Seccion; etiqueta: string; ruta?: string };
export function Sidebar({
    seccion,
    onNavigate,
    abierto,
    puedeGestionarCuadrillas,
    puedeAdministrar = false,
}: Readonly<SidebarProps>) {
    function enlaces(items: Enlace[]) {
        return items.map((item) => (
            <button
                key={item.ruta ?? item.id}
                type="button"
                className={`figma-nav-link ${(item.ruta ? window.location.pathname === item.ruta : seccion === item.id) ? 'selected' : ''}`}
                aria-current={
                    (item.ruta ? window.location.pathname === item.ruta : seccion === item.id)
                        ? 'page'
                        : undefined
                }
                onClick={() => {
                    onNavigate(item.id);
                    if (item.ruta) irA(item.ruta);
                }}
            >
                {item.etiqueta}
            </button>
        ));
    }
    function grupo(titulo: string, icono: Icon, items: Enlace[]) {
        const Icono = icono;
        const activo = items.some((item) => item.id === seccion || Boolean(item.ruta && window.location.pathname.startsWith(item.ruta)));
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
                href={puedeGestionarCuadrillas ? '/dashboard' : '/field'}
                onClick={(e) => {
                    e.preventDefault();
                    onNavigate(puedeGestionarCuadrillas ? 'dashboard' : 'field');
                }}
            >
                <img src="/logo-multicas.png" alt="MULTICAS" />
                <span>
                    <strong>TRACKON</strong>
                    <small>by MULTICAS</small>
                </span>
            </a>
            <div className="erp-sidebar-scroll">
                {puedeGestionarCuadrillas && (
                    <button
                        type="button"
                        aria-current={seccion === 'dashboard' ? 'page' : undefined}
                    className={`erp-home-link ${seccion === 'dashboard' ? 'selected' : ''}`}
                        onClick={() => onNavigate('dashboard')}
                    >
                        <SquaresFourIcon size={21} aria-hidden="true" />
                        Resumen general
                    </button>
                )}
                {puedeGestionarCuadrillas &&
                    grupo(
                        'Comercial',
                        UsersIcon,
                        [
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'CRM',
                                ruta: '/comercial/crm',
                            },
                            { id: 'clientes' as Seccion, etiqueta: 'Clientes' },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Ventas y cotizaciones',
                                ruta: '/comercial/cotizaciones-ventas',
                            },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Catálogo y tarifas',
                                ruta: '/comercial/catalogo-tarifas',
                            },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Portal del cliente',
                                ruta: '/comercial/portal-cuentas',
                            },
                        ].filter((item) => puedeAdministrar || item.ruta !== '/comercial/portal-cuentas'),
                    )}
                {grupo('Operaciones', ToolboxIcon, [
                    ...(puedeGestionarCuadrillas
                        ? [{ id: 'operaciones' as Seccion, etiqueta: 'Gestión de operaciones' }]
                        : []),
                    { id: 'ordenes', etiqueta: 'Órdenes' },
                    { id: 'agenda', etiqueta: 'Agenda' },
                    { id: 'field', etiqueta: 'TrackOn Field' },
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
                            ruta: '/inteligencia/operacion/resumen',
                        },
                    ])}
            </div>
        </aside>
    );
}
