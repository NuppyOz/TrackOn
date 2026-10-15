import type { ReactNode } from "react";

interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    acciones?: ReactNode;
}

function iniciales(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]?.toUpperCase() ?? "").join("") || "TR";
}

export function Header({ usuarioNombre, onLogout, onOpenMenu, acciones }: Readonly<HeaderProps>) {
    const [nombre, rol = "Usuario"] = usuarioNombre.split(" · ");

    return (
        <header className="topbar figma-topbar">
            <button type="button" className="menu-toggle" aria-label="Abrir navegación" onClick={onOpenMenu}>
                ☰
            </button>
            <div className="figma-brand-lockup">
                <img className="brand-logo" src="/logo-multicas.png" alt="MULTICAS" />
                <div className="figma-brand-identity">
                    <strong>MULTICAS</strong>
                    <small>REFRIGERACIÓN Y CLIMATIZACIÓN</small>
                </div>
                <span className="figma-brand-divider" aria-hidden="true" />
                <span className="figma-brand-product">TrackOn</span>
                <span className="figma-brand-tagline">Gestión operativa</span>
            </div>
            <div className="topbar-context figma-user-actions">
                {acciones}
                <span className="figma-user-info">
                    <strong>{nombre}</strong>
                    <small>{rol}</small>
                </span>
                <span className="figma-user-avatar" aria-hidden="true">{iniciales(nombre)}</span>
                <button type="button" className="figma-logout" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}>
                    <svg className="tk-logout-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 4H4v16h5M14 7l5 5-5 5M9 12h10" /></svg>
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </header>
    );
}
