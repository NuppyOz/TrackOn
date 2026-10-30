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
    icono: string;
}

const gestion: Enlace[] = [{ id: "dashboard", etiqueta: "Dashboard", icono: "○" }, { id: "ordenes", etiqueta: "Órdenes", icono: "▤" }, { id: "agenda", etiqueta: "Agenda", icono: "▦" }];
const recursos: Enlace[] = [
    { id: "clientes", etiqueta: "Clientes", icono: "◉" },
    { id: "empleados", etiqueta: "Empleados", icono: "♙" },
    { id: "equipos", etiqueta: "Equipos", icono: "▣" },
    { id: "cuadrillas", etiqueta: "Cuadrillas", icono: "♧" },
    { id: "servicios", etiqueta: "Servicios", icono: "⚒" },
    { id: "materiales", etiqueta: "Materiales", icono: "▦" },
];

export function Sidebar({ seccion, onNavigate, abierto, puedeGestionarCuadrillas, puedeAdministrar = false }: Readonly<SidebarProps>) {
    function enlaces(items: Enlace[]) {
        return items.filter(item => !["dashboard", "cuadrillas", "empleados"].includes(item.id) || puedeGestionarCuadrillas).map(item => (
            <button
                key={item.id}
                type="button"
                className={`figma-nav-link ${seccion === item.id ? "selected" : ""}`}
                aria-current={seccion === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
            >
                <span className="figma-nav-icon" aria-hidden="true">{item.icono}</span>
                <span>{item.etiqueta}</span>
            </button>
        ));
    }

    return (
        <aside className={`sidebar figma-sidebar ${abierto ? "sidebar--open" : ""}`}>
            <div className="figma-sidebar-groups">
                <div className="figma-sidebar-group">
                    <p>GESTIÓN OPERATIVA</p>
                    <nav aria-label="Gestión operativa">{enlaces(gestion)}</nav>
                </div>
                <div className="figma-sidebar-group">
                    <p>RECURSOS</p>
                    <nav aria-label="Recursos">{enlaces(recursos)}</nav>
                </div>
                {puedeAdministrar && <div className="figma-sidebar-group"><p>ADMINISTRACIÓN</p><nav aria-label="Administración">{enlaces([{ id: 'administracion', etiqueta: 'Usuarios y acceso', icono: '♙' }, { id: 'auditoria', etiqueta: 'Auditoría', icono: '≡' }])}</nav></div>}
            </div>
            <div className="figma-sidebar-footer">
                <div className="figma-version">TrackOn · MULTICAS S.A. · v1.0</div>
            </div>
        </aside>
    );
}
