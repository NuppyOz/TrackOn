import type { ReactNode } from "react";

interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    acciones?: ReactNode;
}

export function Header({ usuarioNombre, onLogout, onOpenMenu, acciones }: Readonly<HeaderProps>) {
    return (
        <header className="topbar">
            <button type="button" className="menu-toggle" aria-label="Abrir navegación" onClick={onOpenMenu}>
                ☰
            </button>

            <img className="brand-logo" src="/logo-multicas.png" alt="MULTICAS" />

            <div className="brand">
                <strong>TrackOn</strong>
                <span>MULTICAS S.A.</span>
            </div>

            <div className="topbar-context">
                <span>{usuarioNombre}</span>
                {acciones}

                <button type="button" className="text-button" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}
