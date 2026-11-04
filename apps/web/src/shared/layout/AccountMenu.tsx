import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { SignOutIcon } from "@phosphor-icons/react";

const ITEMS = '[role="menuitem"]:not([disabled])';

function iniciales(nombre: string): string {
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "TR";
    return partes.slice(0, 2).map(parte => parte[0]?.toUpperCase() ?? "").join("");
}

interface AccountMenuProps {
    usuarioNombre: string;
    onLogout: () => void;
}

/**
 * Menú de cuenta del avatar: única entrada para "Cerrar sesión".
 * El cierre efectivo lo confirma App antes de invocar la API.
 */
export function AccountMenu({ usuarioNombre, onLogout }: Readonly<AccountMenuProps>) {
    const [nombre, rol = "Usuario"] = usuarioNombre.split(" · ");
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    const disparador = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const idPanel = useId();

    useEffect(() => {
        if (!abierto) return;

        function alPulsarFuera(evento: MouseEvent) {
            if (contenedor.current && !contenedor.current.contains(evento.target as Node)) setAbierto(false);
        }

        document.addEventListener("mousedown", alPulsarFuera);
        return () => document.removeEventListener("mousedown", alPulsarFuera);
    }, [abierto]);

    useEffect(() => {
        if (!abierto) return;
        panel.current?.querySelector<HTMLElement>(ITEMS)?.focus();
    }, [abierto]);

    function cerrarConFoco() {
        setAbierto(false);
        disparador.current?.focus();
    }

    function opciones(): HTMLElement[] {
        return panel.current ? Array.from(panel.current.querySelectorAll<HTMLElement>(ITEMS)) : [];
    }

    function alTeclearDisparador(evento: KeyboardEvent<HTMLButtonElement>) {
        if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
            evento.preventDefault();
            setAbierto(true);
        }
    }

    function alTeclearPanel(evento: KeyboardEvent<HTMLDivElement>) {
        if (evento.key === "Escape") {
            evento.preventDefault();
            evento.stopPropagation();
            cerrarConFoco();
            return;
        }

        if (evento.key === "Tab") {
            cerrarConFoco();
            return;
        }

        const items = opciones();
        if (items.length === 0) return;

        const mover = (destino: number) => {
            evento.preventDefault();
            items[(destino + items.length) % items.length]?.focus();
        };

        const actual = items.indexOf(document.activeElement as HTMLElement);

        if (evento.key === "ArrowDown") mover(actual + 1);
        else if (evento.key === "ArrowUp") mover(actual - 1);
        else if (evento.key === "Home") mover(0);
        else if (evento.key === "End") mover(items.length - 1);
    }

    function confirmarSalida() {
        cerrarConFoco();
        onLogout();
    }

    return (
        <div className="account-menu" ref={contenedor}>
            <button
                ref={disparador}
                type="button"
                className="account-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-controls={abierto ? idPanel : undefined}
                aria-label={`Menú de cuenta de ${nombre}`}
                onClick={() => setAbierto(valor => !valor)}
                onKeyDown={alTeclearDisparador}
            >
                <span className="figma-user-info">
                    <strong>{nombre}</strong>
                    <small>{rol}</small>
                </span>
                <span className="figma-user-avatar" aria-hidden="true" title={usuarioNombre}>{iniciales(nombre)}</span>
            </button>
            {abierto && (
                <div
                    ref={panel}
                    id={idPanel}
                    role="menu"
                    aria-label="Opciones de cuenta"
                    className="account-menu__panel"
                    onKeyDown={alTeclearPanel}
                >
                    <button type="button" role="menuitem" className="account-menu__item" onClick={confirmarSalida}>
                        <SignOutIcon size={18} aria-hidden="true" />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
}
