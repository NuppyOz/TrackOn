import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, type Seccion } from "./Sidebar";

interface MainLayoutProps {
    children: ReactNode;
    usuarioNombre: string;
    seccion: Seccion;
    menuAbierto: boolean;
    puedeGestionarCuadrillas: boolean;
    onNavigate: (seccion: Seccion) => void;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    onLogout: () => void;
    accionesHeader?: ReactNode;
}

const etiquetas: Record<Seccion, string> = {
    ordenes: "Órdenes de trabajo",
    clientes: "Clientes",
    equipos: "Equipos",
    servicios: "Servicios",
    cuadrillas: "Cuadrillas",
};

export function MainLayout({
    children,
    usuarioNombre,
    seccion,
    menuAbierto,
    puedeGestionarCuadrillas,
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
                abierto={menuAbierto}
                onNavigate={onNavigate}
                puedeGestionarCuadrillas={puedeGestionarCuadrillas}
            />
            <main className="workspace">
                {seccion !== "ordenes" && (
                    <div className="tk-context-breadcrumb">
                        Recursos <span aria-hidden="true">›</span> <strong>{etiquetas[seccion]}</strong>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
