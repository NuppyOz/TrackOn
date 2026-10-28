import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, type Seccion } from "./Sidebar";

interface MainLayoutProps {
    children: ReactNode;
    usuarioNombre: string;
    seccion: Seccion;
    menuAbierto: boolean;
    puedeGestionarCuadrillas: boolean;
    puedeAdministrar?: boolean;
    onNavigate: (seccion: Seccion) => void;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    onLogout: () => void;
    accionesHeader?: ReactNode;
}

const etiquetas: Record<Seccion, string> = {
    agenda: "Agenda", administracion: "Usuarios y permisos", auditoria: "Auditoría",
    dashboard: "Dashboard",
    materiales: "Materiales",
    clientes: "Clientes",
    empleados: "Empleados",
    ordenes: "Órdenes de trabajo",
    equipos: "Equipos",
    servicios: "Servicios",
    cuadrillas: "Cuadrillas",
    comercial: "Comercial",
    inteligencia: "IA y negocio",
    operaciones: "Operaciones de servicio",
    field: "TrackOn Field",
};

export function MainLayout({
    children,
    usuarioNombre,
    seccion,
    menuAbierto,
    puedeGestionarCuadrillas,
    puedeAdministrar,
    onNavigate,
    onOpenMenu,
    onCloseMenu,
    onLogout,
    accionesHeader,
}: Readonly<MainLayoutProps>) {
    return (
        <div className="app-shell">
            <Header
                usuarioNombre={usuarioNombre}
                onLogout={onLogout}
                onOpenMenu={onOpenMenu}
                acciones={accionesHeader}
            />
            {menuAbierto && (
                <button type="button" className="nav-backdrop"
                    aria-label="Cerrar navegación" onClick={onCloseMenu} />
            )}
            <Sidebar
                seccion={seccion}
                usuarioNombre={usuarioNombre}
                abierto={menuAbierto}
                onNavigate={onNavigate}
                puedeGestionarCuadrillas={puedeGestionarCuadrillas}
                puedeAdministrar={puedeAdministrar}
            />
            <main className="workspace">
                {seccion !== "ordenes" && seccion !== "dashboard" && (
                    <div className="tk-context-breadcrumb">
                        {['agenda', 'operaciones', 'field'].includes(seccion) ? 'Operaciones' : ['administracion', 'auditoria'].includes(seccion) ? 'Administración' : ['comercial', 'inteligencia'].includes(seccion) ? 'TrackOn' : 'Recursos'} <span aria-hidden="true">›</span> <strong>{etiquetas[seccion]}</strong>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
