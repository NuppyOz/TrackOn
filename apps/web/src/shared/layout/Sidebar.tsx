import {
    BriefcaseBusiness, Building2, CalendarDays, ClipboardList, FileClock,
    LayoutDashboard, PackageOpen, Settings2, ShieldCheck, Snowflake, UsersRound, type LucideIcon,
} from "lucide-react";

export type Seccion = "agenda" | "administracion" | "auditoria" | "dashboard" | "materiales" | "clientes" | "empleados" | "equipos" | "servicios" | "ordenes" | "cuadrillas";

interface SidebarProps {
    seccion: Seccion;
    onNavigate: (seccion: Seccion) => void;
    abierto: boolean;
    puedeGestionarCuadrillas: boolean;
    puedeAdministrar?: boolean;
}

interface Enlace {
    id: Seccion;
    etiqueta: string;
    icono: LucideIcon;
}

const gestion: Enlace[] = [
    { id: "dashboard", etiqueta: "Centro operativo", icono: LayoutDashboard },
    { id: "ordenes", etiqueta: "Órdenes", icono: ClipboardList },
    { id: "agenda", etiqueta: "Agenda", icono: CalendarDays },
];
const recursos: Enlace[] = [
    { id: "clientes", etiqueta: "Clientes", icono: Building2 },
    { id: "empleados", etiqueta: "Empleados", icono: BriefcaseBusiness },
    { id: "equipos", etiqueta: "Equipos", icono: Snowflake },
    { id: "cuadrillas", etiqueta: "Cuadrillas", icono: UsersRound },
    { id: "servicios", etiqueta: "Servicios", icono: Settings2 },
    { id: "materiales", etiqueta: "Materiales", icono: PackageOpen },
];

export function Sidebar({ seccion, onNavigate, abierto, puedeGestionarCuadrillas, puedeAdministrar = false }: Readonly<SidebarProps>) {
    function enlaces(items: Enlace[]) {
        return items.filter(item => !["dashboard", "cuadrillas", "empleados"].includes(item.id) || puedeGestionarCuadrillas).map(item => {
            const Icono = item.icono;
            return (
            <button
                key={item.id}
                type="button"
                className={`figma-nav-link ${seccion === item.id ? "selected" : ""}`}
                aria-current={seccion === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
            >
                <Icono className="figma-nav-icon" aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{item.etiqueta}</span>
            </button>
            );
        });
    }

    return (
        <aside id="navegacion-principal" aria-label="Navegación principal"
            className={`sidebar figma-sidebar ${abierto ? "sidebar--open" : ""}`}>
            <div className="figma-sidebar-groups sidebar-scroll-area">
                <div className="figma-sidebar-group">
                    <p>GESTIÓN OPERATIVA</p>
                    <nav aria-label="Gestión operativa">{enlaces(gestion)}</nav>
                </div>
                <div className="figma-sidebar-group">
                    <p>RECURSOS</p>
                    <nav aria-label="Recursos">{enlaces(recursos)}</nav>
                </div>
                {puedeAdministrar && <div className="figma-sidebar-group"><p>ADMINISTRACIÓN</p><nav aria-label="Administración">{enlaces([{ id: 'administracion', etiqueta: 'Usuarios y acceso', icono: ShieldCheck }, { id: 'auditoria', etiqueta: 'Auditoría', icono: FileClock }])}</nav></div>}
            </div>
            <div className="figma-sidebar-footer">
                <div className="figma-version">TrackOn · MULTICAS S.A. · v1.0</div>
            </div>
        </aside>
    );
}
