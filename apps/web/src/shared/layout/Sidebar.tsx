export type Seccion = "equipos" | "servicios" | "cuadrillas";

interface SidebarProps {
    seccion: Seccion;
    onNavigate: (seccion: Seccion) => void;
    abierto: boolean;
    puedeGestionarCuadrillas: boolean;
}

export function Sidebar({ seccion, onNavigate, abierto, puedeGestionarCuadrillas }: Readonly<SidebarProps>) {
    return (
        <aside className={`sidebar ${abierto ? "sidebar--open" : ""}`}>
            <p>GESTIÓN OPERATIVA</p>

            <button
                type="button"
                className={seccion === "equipos" ? "selected" : ""}
                onClick={() => onNavigate("equipos")}
            >
                <span>▣</span> Equipos
            </button>

            <button
                type="button"
                className={seccion === "servicios" ? "selected" : ""}
                onClick={() => onNavigate("servicios")}
            >
                <span>≡</span> Servicios
            </button>

            {puedeGestionarCuadrillas && (
                <button
                    type="button"
                    className={seccion === "cuadrillas" ? "selected" : ""}
                    onClick={() => onNavigate("cuadrillas")}
                >
                    <span>♟</span> Cuadrillas
                </button>
            )}

            <div className="sidebar-note">
                <strong>MULTICAS</strong>
                <span>Gestión técnica centralizada</span>
            </div>
        </aside>
    );
}
