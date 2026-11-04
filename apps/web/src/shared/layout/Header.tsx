import type { ReactNode, Ref } from "react";
import { AccountMenu } from "./AccountMenu";

interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    menuAbierto?: boolean;
    toggleRef?: Ref<HTMLButtonElement>;
    acciones?: ReactNode;
}

export function Header({ usuarioNombre, onLogout, onOpenMenu, menuAbierto = false, toggleRef, acciones }: Readonly<HeaderProps>) {
    return (
        <header className="topbar figma-topbar">
            <button
                ref={toggleRef}
                type="button"
                className="menu-toggle"
                aria-label="Abrir navegación"
                aria-expanded={menuAbierto}
                aria-controls="navegacion-principal"
                onClick={onOpenMenu}
            >
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
                <AccountMenu usuarioNombre={usuarioNombre} onLogout={onLogout} />
            </div>
        </header>
    );
}
