import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Menu } from "lucide-react";

interface HeaderProps {
    usuarioNombre: string;
    onLogout: () => void;
    onOpenMenu: () => void;
    menuAbierto: boolean;
    acciones?: ReactNode;
}

function iniciales(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map(parte => parte[0]?.toUpperCase() ?? "").join("") || "TR";
}

export function Header({ usuarioNombre, onLogout, onOpenMenu, menuAbierto, acciones }: Readonly<HeaderProps>) {
    const [nombre, rol = "Usuario"] = usuarioNombre.split(" · ");
    const [cuentaAbierta, setCuentaAbierta] = useState(false);
    const cuentaRef = useRef<HTMLDivElement>(null);
    const botonCuentaRef = useRef<HTMLButtonElement>(null);
    const salirRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!cuentaAbierta) return;
        const cerrarFuera = (event: MouseEvent) => {
            if (!cuentaRef.current?.contains(event.target as Node)) setCuentaAbierta(false);
        };
        const cerrarConTeclado = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setCuentaAbierta(false);
                botonCuentaRef.current?.focus();
            }
        };
        document.addEventListener("mousedown", cerrarFuera);
        document.addEventListener("keydown", cerrarConTeclado);
        return () => {
            document.removeEventListener("mousedown", cerrarFuera);
            document.removeEventListener("keydown", cerrarConTeclado);
        };
    }, [cuentaAbierta]);

    return (
        <header className="topbar figma-topbar">
            <button type="button" className="menu-toggle" aria-label="Abrir navegación"
                aria-controls="navegacion-principal" aria-expanded={menuAbierto} onClick={onOpenMenu}>
                <Menu aria-hidden="true" size={21} strokeWidth={1.9} />
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
                <div className="figma-account" ref={cuentaRef}>
                    <button ref={botonCuentaRef} type="button" className="figma-account-trigger"
                        aria-label={`Abrir menú de cuenta de ${nombre}`} aria-haspopup="menu" aria-expanded={cuentaAbierta}
                        onClick={() => setCuentaAbierta(abierta => !abierta)}
                        onKeyDown={event => {
                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setCuentaAbierta(true);
                                requestAnimationFrame(() => salirRef.current?.focus());
                            }
                        }}>
                        <span className="figma-user-info">
                            <strong>{nombre}</strong>
                            <small>{rol}</small>
                        </span>
                        <span className="figma-user-avatar" aria-hidden="true">{iniciales(nombre)}</span>
                        <ChevronDown className="figma-account-chevron" aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                    {cuentaAbierta && <div className="figma-account-menu" role="menu">
                        <div className="figma-account-summary">
                            <strong>{nombre}</strong>
                            <span>{rol}</span>
                        </div>
                        <button ref={salirRef} type="button" role="menuitem" onClick={() => { setCuentaAbierta(false); onLogout(); }}>
                            Cerrar sesión
                        </button>
                    </div>}
                </div>
            </div>
        </header>
    );
}
