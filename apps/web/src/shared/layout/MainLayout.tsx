import { useEffect, type ReactNode } from "react";
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
    useEffect(() => {
        if (!menuAbierto) return;

        const overflowAnterior = document.body.style.overflow;
        const cerrarConEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCloseMenu();
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", cerrarConEscape);
        return () => {
            document.body.style.overflow = overflowAnterior;
            document.removeEventListener("keydown", cerrarConEscape);
        };
    }, [menuAbierto, onCloseMenu]);

    return (
        <div className="app-shell">
            <Header
                usuarioNombre={usuarioNombre}
                onLogout={onLogout}
                onOpenMenu={onOpenMenu}
                menuAbierto={menuAbierto}
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
                puedeAdministrar={puedeAdministrar}
            />
            <main className="workspace">
                {children}
            </main>
        </div>
    );
}
