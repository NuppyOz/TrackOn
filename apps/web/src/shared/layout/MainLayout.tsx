import { useEffect, useRef, type ReactNode } from "react";
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
    agenda: "Agenda", administracion: "Usuarios y acceso", auditoria: "Auditoría",
    dashboard: "Dashboard",
    materiales: "Materiales",
    clientes: "Clientes",
    empleados: "Empleados",
    ordenes: "Órdenes de trabajo",
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
    puedeAdministrar,
    onNavigate,
    onOpenMenu,
    onCloseMenu,
    onLogout,
    accionesHeader,
}: Readonly<MainLayoutProps>) {
    const botonMenu = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!menuAbierto) return;

        function alTeclear(evento: KeyboardEvent) {
            if (evento.key !== "Escape") return;
            onCloseMenu();
            botonMenu.current?.focus();
        }

        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [menuAbierto, onCloseMenu]);

    return (
        <div className="app-shell">
            <Header
                usuarioNombre={usuarioNombre}
                onLogout={onLogout}
                onOpenMenu={onOpenMenu}
                menuAbierto={menuAbierto}
                toggleRef={botonMenu}
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
                <h1 className="sr-only">{etiquetas[seccion]}</h1>
                {seccion !== "ordenes" && seccion !== "dashboard" && (
                    <div className="tk-context-breadcrumb">
                        {seccion === 'agenda' ? 'Operaciones' : ['administracion', 'auditoria'].includes(seccion) ? 'Administración' : 'Recursos'} <span aria-hidden="true">›</span> <strong>{etiquetas[seccion]}</strong>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
