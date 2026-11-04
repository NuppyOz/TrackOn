import { useState, type ReactNode, type Ref } from 'react';
import { MagnifyingGlassIcon, ListIcon, CaretDownIcon } from '@phosphor-icons/react';
import { irA } from '../navigation';
import { AccountMenu } from './AccountMenu';
interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    menuAbierto?: boolean;
    toggleRef?: Ref<HTMLButtonElement>;
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
export function Header({ usuarioNombre, onLogout, onOpenMenu, menuAbierto = false, toggleRef, acciones }: Readonly<HeaderProps>) {
    const [busqueda, setBusqueda] = useState('');
    return (
        <header className="topbar figma-topbar">
            <button
                ref={toggleRef}
                type="button"
                className="menu-toggle"
                aria-label="Abrir navegación"
                aria-expanded={menuAbierto}
                aria-controls="navegacion-principal"
                onClick={onOpenMenu}
            >
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
                <AccountMenu usuarioNombre={usuarioNombre} onLogout={onLogout} />
            </div>
        </header>
    );
}
