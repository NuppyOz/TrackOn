export type Seccion = "clientes" | "equipos" | "servicios" | "ordenes" | "cuadrillas";

interface SidebarProps {
    seccion: Seccion;
    onNavigate: (seccion: Seccion) => void;
    abierto: boolean;
    puedeGestionarCuadrillas: boolean;
}

interface Enlace {
    id: Seccion;
    etiqueta: string;
    icono: string;
}

const gestion: Enlace[] = [{ id: "ordenes", etiqueta: "Órdenes", icono: "▤" }];
const recursos: Enlace[] = [
    { id: "clientes", etiqueta: "Clientes", icono: "◉" },
    { id: "equipos", etiqueta: "Equipos", icono: "▣" },
    { id: "cuadrillas", etiqueta: "Cuadrillas", icono: "♧" },
    { id: "servicios", etiqueta: "Servicios", icono: "⚒" },
];

export function Sidebar({ seccion, onNavigate, abierto, puedeGestionarCuadrillas }: Readonly<SidebarProps>) {
    function enlaces(items: Enlace[]) {
        return items.filter(item => item.id !== "cuadrillas" || puedeGestionarCuadrillas).map(item => (
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
            </div>
            <div className="figma-sidebar-footer">
                <a className="figma-help-card" href="https://github.com/NuppyOz/TrackOn#readme" target="_blank" rel="noreferrer">
                    <strong>Centro de ayuda</strong>
                    <small>Consulta la documentación disponible de TrackOn.</small>
                    <span>Ver documentación ›</span>
                </a>
                <div className="figma-version">TrackOn · MULTICAS S.A. · v1.0</div>
            </div>
        </aside>
    );
}
