import { useEffect, useRef, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, type Seccion } from "./Sidebar";

interface MainLayoutProps {
    children: ReactNode;
    usuarioNombre: string;
    seccion: Seccion;
    menuAbierto: boolean;
    puedeGestionarCuadrillas: boolean;
    puedeAdministrar?: boolean;
    onNavigate: (seccion: Seccion, ruta?: string) => void;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    onLogout: () => void;
    accionesHeader?: ReactNode;
}

const etiquetas: Record<Seccion, string> = {
    agenda: "Agenda", administracion: "Usuarios y permisos", auditoria: "Auditoría",
    dashboard: "Análisis",
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
    field: "MultiCore ERP Field",
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
    const [esMovil, setEsMovil] = useState(() => typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 1199px)').matches
        : window.innerWidth <= 1199);
    const [sidebarColapsado, setSidebarColapsado] = useState(false);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            const actualizarAncho = () => {
                const movil = window.innerWidth <= 1199;
                setEsMovil(movil);
                if (!movil) onCloseMenu();
            };
            window.addEventListener('resize', actualizarAncho);
            return () => window.removeEventListener('resize', actualizarAncho);
        }
        const consulta = window.matchMedia('(max-width: 1199px)');
        const actualizar = () => {
            setEsMovil(consulta.matches);
            if (!consulta.matches) onCloseMenu();
        };
        consulta.addEventListener('change', actualizar);
        return () => consulta.removeEventListener('change', actualizar);
    }, [onCloseMenu]);

    function alternarNavegacion() {
        if (esMovil) {
            if (menuAbierto) onCloseMenu();
            else onOpenMenu();
            return;
        }
        setSidebarColapsado(valor => !valor);
    }

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
        <div className={`app-shell${sidebarColapsado ? ' sidebar-collapsed' : ''}`}>
            <Header
                usuarioNombre={usuarioNombre}
                onLogout={onLogout}
                onOpenMenu={alternarNavegacion}
                menuAbierto={esMovil ? menuAbierto : !sidebarColapsado}
                etiquetaNavegacion={esMovil
                    ? menuAbierto ? 'Cerrar navegación' : 'Abrir navegación'
                    : sidebarColapsado ? 'Expandir navegación' : 'Contraer navegación'}
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
                {children}
            </main>
        </div>
    );
}
