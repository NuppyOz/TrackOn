import { useState, type ReactNode, type Ref } from 'react';
import { MagnifyingGlassIcon, ListIcon, CaretDownIcon } from '@phosphor-icons/react';
import { irA, RUTAS } from '../navigation';
import { AccountMenu } from './AccountMenu';
interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    menuAbierto?: boolean;
    etiquetaNavegacion?: string;
    toggleRef?: Ref<HTMLButtonElement>;
    acciones?: ReactNode;
}
const destinos = [
    { nombre: 'Resumen general', ruta: RUTAS.dashboard },
    { nombre: 'Clientes y CRM', ruta: RUTAS.comercial.crm },
    { nombre: 'Nuevo cliente', ruta: RUTAS.comercial['crm-nuevo'] },
    { nombre: 'Oportunidades comerciales', ruta: RUTAS.comercial['ventas-oportunidades'] },
    { nombre: 'Cotizaciones', ruta: RUTAS.comercial['ventas-cotizaciones'] },
    { nombre: 'Ventas registradas', ruta: RUTAS.comercial['ventas-registradas'] },
    { nombre: 'Catálogo comercial', ruta: RUTAS.comercial.catalogo },
    { nombre: 'Tarifas', ruta: RUTAS.comercial['catalogo-tarifas'] },
    { nombre: 'Accesos de clientes', ruta: RUTAS.comercial['portal-cuentas'] },
    { nombre: 'Órdenes de trabajo', ruta: RUTAS.ordenes },
    { nombre: 'Solicitudes de servicio', ruta: RUTAS.operaciones.solicitudes },
    { nombre: 'Diagnóstico técnico', ruta: RUTAS.operaciones.diagnostico },
    { nombre: 'Ejecución técnica', ruta: RUTAS.operaciones.ejecucion },
    { nombre: 'Evidencias del servicio', ruta: RUTAS.operaciones.evidencias },
    { nombre: 'Despacho y asignación', ruta: RUTAS.operaciones.despacho },
    { nombre: 'Agenda y planificación', ruta: RUTAS.agenda },
    { nombre: 'Tipos de servicio', ruta: RUTAS.servicios },
    { nombre: 'Equipos', ruta: RUTAS.equipos },
    { nombre: 'Materiales', ruta: RUTAS.materiales },
    { nombre: 'Indicadores comerciales', ruta: RUTAS.inteligencia.comercial },
    { nombre: 'Indicadores financieros', ruta: RUTAS.inteligencia.financiero },
    { nombre: 'Indicadores logísticos', ruta: RUTAS.inteligencia.logistico },
    { nombre: 'Indicadores de calidad', ruta: RUTAS.inteligencia.calidad },
];
export function Header({ usuarioNombre, onLogout, onOpenMenu, menuAbierto = false, etiquetaNavegacion, toggleRef, acciones }: Readonly<HeaderProps>) {
    const [busqueda, setBusqueda] = useState('');
    return (
        <header className="topbar figma-topbar">
            <button
                ref={toggleRef}
                type="button"
                className="menu-toggle"
                aria-label={etiquetaNavegacion ?? (menuAbierto ? 'Cerrar navegación' : 'Abrir navegación')}
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
                        placeholder="Buscar en MultiCore ERP"
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
