import { useState, type ReactNode } from 'react';
import { MagnifyingGlassIcon, ListIcon, SignOutIcon, CaretDownIcon } from '@phosphor-icons/react';
import { irA } from '../navigation';
interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    acciones?: ReactNode;
}
const destinos = [
    { nombre: 'Resumen general', ruta: '/dashboard' },
    { nombre: 'Clientes y CRM', ruta: '/comercial/crm' },
    { nombre: 'Cotizaciones y ventas', ruta: '/comercial/cotizaciones-ventas' },
    { nombre: 'Catálogo y tarifas', ruta: '/comercial/catalogo-tarifas' },
    { nombre: 'Portal del cliente', ruta: '/comercial/portal-cuentas' },
    { nombre: 'Órdenes de trabajo', ruta: '/ordenes' },
    { nombre: 'Agenda y planificación', ruta: '/agenda' },
    { nombre: 'Equipos', ruta: '/equipos' },
    { nombre: 'Materiales', ruta: '/materiales' },
    { nombre: 'Indicadores comerciales', ruta: '/inteligencia/comercial' },
    { nombre: 'Indicadores financieros', ruta: '/inteligencia/financiero' },
    { nombre: 'Indicadores logísticos', ruta: '/inteligencia/logistico' },
    { nombre: 'Indicadores de calidad', ruta: '/inteligencia/calidad' },
];
export function Header({ usuarioNombre, onLogout, onOpenMenu, acciones }: Readonly<HeaderProps>) {
    const [busqueda, setBusqueda] = useState('');
    const [nombre, rol = 'Usuario'] = usuarioNombre.split(' · ');
    return (
        <header className="topbar figma-topbar">
            <button type="button" className="menu-toggle" aria-label="Abrir navegación" onClick={onOpenMenu}>
                <ListIcon size={24} />
            </button>
            <div className="erp-location">
                <span>Sucursal</span>
                <strong>Managua Central</strong>
                <CaretDownIcon size={14} aria-hidden="true" />
            </div>
            <div className="topbar-context figma-user-actions">
                <div className="erp-global-search">
                    <MagnifyingGlassIcon size={20} aria-hidden="true" />
                    <input
                        aria-label="Buscar módulo"
                        placeholder="Buscar en TrackOn"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setBusqueda('');
                        }}
                    />
                    {busqueda && (
                        <div className="erp-search-results">
                            {destinos
                                .filter((d) =>
                                    d.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()),
                                )
                                .map((d) => (
                                    <button
                                        key={d.ruta}
                                        type="button"
                                        onClick={() => {
                                            irA(d.ruta);
                                            setBusqueda('');
                                        }}
                                    >
                                        {d.nombre}
                                    </button>
                                ))}
                            {!destinos.some((d) =>
                                d.nombre.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()),
                            ) && <p>No se encontraron módulos.</p>}
                        </div>
                    )}
                </div>
                {acciones}
                <span className="figma-user-info">
                    <strong>{nombre}</strong>
                    <small>{rol}</small>
                </span>
                <span className="figma-user-avatar" title={usuarioNombre}>
                    {nombre
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')}
                </span>
                <button
                    type="button"
                    className="figma-logout"
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    onClick={onLogout}
                >
                    <SignOutIcon size={21} />
                </button>
            </div>
        </header>
    );
}
