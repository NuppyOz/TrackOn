import {
    ActivityIcon,
    BuildingsIcon,
    CaretDownIcon,
    CubeIcon,
    GearSixIcon,
    ListBulletsIcon,
    NotebookIcon,
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
    usuarioNombre?: string;
}
type Enlace = { id: Seccion; etiqueta: string; ruta?: string };
export function Sidebar({
    seccion,
    onNavigate,
    abierto,
    puedeGestionarCuadrillas,
    puedeAdministrar = false,
    usuarioNombre = 'TrackOn',
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
        const activo = items.some((item) =>
            item.ruta ? window.location.pathname.startsWith(item.ruta) : item.id === seccion,
        );
        return (
            <details className="erp-nav-group" key={titulo} open={activo || undefined}>
                <summary>
                    <Icono size={20} aria-hidden="true" />
                    <span>{titulo}</span>
                    <CaretDownIcon size={14} aria-hidden="true" />
                </summary>
                <nav aria-label={titulo}>{enlaces(items)}</nav>
            </details>
        );
    }
    const [nombre, rol = 'Usuario'] = usuarioNombre.split(' · ');
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
                <p className="erp-nav-caption">SUBSISTEMAS</p>
                {puedeGestionarCuadrillas &&
                    grupo(
                        'Gestión comercial y clientes',
                        UsersIcon,
                        [
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Clientes y CRM',
                                ruta: '/comercial/crm',
                            },
                            { id: 'clientes' as Seccion, etiqueta: 'Directorio de clientes' },
                            {
                                id: 'comercial' as Seccion,
                                etiqueta: 'Cotizaciones y ventas',
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
                {grupo('Servicios y operaciones de campo', ToolboxIcon, [
                    ...(puedeGestionarCuadrillas
                        ? [{ id: 'operaciones' as Seccion, etiqueta: 'Operaciones de servicio' }]
                        : []),
                    { id: 'ordenes', etiqueta: 'Órdenes de trabajo' },
                    { id: 'agenda', etiqueta: 'Agenda y planificación' },
                    { id: 'field', etiqueta: 'TrackOn Field' },
                    { id: 'servicios', etiqueta: 'Tipos de servicio' },
                ])}
                {!puedeGestionarCuadrillas &&
                    grupo('Clientes', UsersIcon, [{ id: 'clientes', etiqueta: 'Directorio de clientes' }])}
                {grupo('Activos y mantenimiento', GearSixIcon, [
                    { id: 'equipos', etiqueta: 'Equipos del cliente' },
                ])}
                {grupo('Compras, inventario y logística', CubeIcon, [
                    { id: 'materiales', etiqueta: 'Materiales' },
                    ...(puedeGestionarCuadrillas
                        ? [
                              {
                                  id: 'inteligencia' as Seccion,
                                  etiqueta: 'Registros logísticos',
                                  ruta: '/inteligencia/origen/logistica',
                              },
                          ]
                        : []),
                ])}
                {puedeGestionarCuadrillas &&
                    grupo('Finanzas y rentabilidad', NotebookIcon, [
                        {
                            id: 'inteligencia',
                            etiqueta: 'Registros financieros',
                            ruta: '/inteligencia/origen/finanzas',
                        },
                    ])}
                {puedeGestionarCuadrillas &&
                    grupo('Recursos humanos', BuildingsIcon, [
                        { id: 'empleados', etiqueta: 'Empleados' },
                        { id: 'cuadrillas', etiqueta: 'Cuadrillas' },
                    ])}
                {puedeAdministrar &&
                    grupo('Administración y seguridad', ShieldCheckIcon, [
                        { id: 'administracion', etiqueta: 'Usuarios y permisos' },
                        { id: 'auditoria', etiqueta: 'Auditoría' },
                    ])}
                {puedeGestionarCuadrillas &&
                    grupo('Inteligencia y control', ActivityIcon, [
                        {
                            id: 'inteligencia',
                            etiqueta: 'Indicadores comerciales',
                            ruta: '/inteligencia/comercial',
                        },
                        {
                            id: 'inteligencia',
                            etiqueta: 'Indicadores financieros',
                            ruta: '/inteligencia/financiero',
                        },
                        {
                            id: 'inteligencia',
                            etiqueta: 'Indicadores logísticos',
                            ruta: '/inteligencia/logistico',
                        },
                        {
                            id: 'inteligencia',
                            etiqueta: 'Indicadores de calidad',
                            ruta: '/inteligencia/calidad',
                        },
                        {
                            id: 'inteligencia',
                            etiqueta: 'IA y negocio',
                            ruta: '/inteligencia/operacion/resumen',
                        },
                    ])}
            </div>
            <div className="erp-sidebar-account">
                <span className="erp-account-avatar">
                    {nombre
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')}
                </span>
                <span>
                    <strong>{nombre}</strong>
                    <small>{rol}</small>
                </span>
                <ListBulletsIcon size={18} aria-hidden="true" />
            </div>
        </aside>
    );
}
