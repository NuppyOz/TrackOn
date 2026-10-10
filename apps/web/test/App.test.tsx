
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";

import App from "../src/App";
import type { UsuarioSesion } from "../src/features/auth/auth.api";

const mocks = vi.hoisted(() => ({
    renovarSesion: vi.fn(),
    cerrarSesion: vi.fn(),
}));

vi.mock("../src/features/auth/auth.api", () => ({
    renovarSesion: mocks.renovarSesion,
    cerrarSesion: mocks.cerrarSesion,
    puedeAdministrarCatalogos: (rol: string) =>
        rol === "ADMIN" || rol === "GTE_OPE",
}));

vi.mock("../src/features/auth/LoginPage", () => ({
    default: ({
        onLogin,
    }: {
        onLogin: (usuario: UsuarioSesion) => void;
    }) => (
        <div>
            <p>Página de login</p>
            <button
                type="button"
                onClick={() =>
                    onLogin({
                        id: 1,
                        identificador: "admin.test",
                        rol: {
                            cod: "ADMIN",
                            nombre: "Administrador",
                        },
                        empleado: {},
                    })
                }
            >
                Simular login
            </button>
        </div>
    ),
}));

vi.mock("../src/features/equipos/EquiposManager", () => ({
    default: ({ puedeGestionar }: { puedeGestionar: boolean }) => (
        <div>
            Equipos - {puedeGestionar ? "gestión" : "consulta"}
        </div>
    ),
}));

vi.mock("../src/features/servicios/ServiciosManager", () => ({
    default: ({ puedeGestionar }: { puedeGestionar: boolean }) => (
        <div>
            Servicios - {puedeGestionar ? "gestión" : "consulta"}
        </div>
    ),
}));

vi.mock("../src/features/cuadrillas/CuadrillasManager", () => ({
    default: () => <div>Gestión de cuadrillas</div>,
}));

vi.mock("../src/features/notificaciones/NotificationsBell", () => ({
    default: () => <div>Notificaciones</div>,
}));

vi.mock("../src/shared/layout/MainLayout", () => ({
    MainLayout: ({
        usuarioNombre,
        onNavigate,
        onLogout,
        children,
    }: {
        usuarioNombre: string;
        onNavigate: (seccion: "equipos" | "servicios" | "cuadrillas") => void;
        onLogout: () => void;
        children: React.ReactNode;
    }) => (
        <div>
            <header>{usuarioNombre}</header>
            <nav>
                <button type="button" onClick={() => onNavigate("equipos")}>
                    Equipos
                </button>
                <button type="button" onClick={() => onNavigate("servicios")}>
                    Servicios
                </button>
                <button type="button" onClick={() => onNavigate("cuadrillas")}>
                    Cuadrillas
                </button>
                <button type="button" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </nav>
            <main>{children}</main>
        </div>
    ),
}));

const admin: UsuarioSesion = {
    id: 1,
    identificador: "administrador.trackon",
    rol: {
        cod: "ADMIN",
        nombre: "Administrador",
    },
    empleado: {
        persona: {
            firstName: "Usuario",
            firstLastName: "Administrador",
        },
    },
};

const tecnico: UsuarioSesion = {
    id: 2,
    identificador: "tecnico.prueba",
    rol: {
        cod: "TEC",
        nombre: "Técnico",
    },
    empleado: {},
};

const gerente: UsuarioSesion = {
    id: 3,
    identificador: "gerente.prueba",
    rol: {
        cod: "GTE_OPE",
        nombre: "Gerente de operaciones",
    },
    empleado: {},
};

beforeEach(() => {
    vi.resetAllMocks();

    mocks.renovarSesion.mockResolvedValue(admin);
    mocks.cerrarSesion.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
});

describe("Aplicación TrackOn", () => {
    it("muestra la verificación inicial", () => {
        mocks.renovarSesion.mockReturnValue(
            new Promise(() => {}),
        );

        render(<App />);

        expect(
            screen.getByText("Verificando sesión…"),
        ).toBeTruthy();
    });

    it("restaura una sesión de administrador", async () => {
        render(<App />);

        expect(
            await screen.findByText("Equipos - gestión"),
        ).toBeTruthy();

        expect(
            screen.getByText(/Usuario Administrador/),
        ).toBeTruthy();
    });

    it("muestra el login cuando no existe una sesión", async () => {
        mocks.renovarSesion.mockResolvedValue(null);

        render(<App />);

        expect(
            await screen.findByText("Página de login"),
        ).toBeTruthy();
    });

    it("muestra el login cuando falla la restauración", async () => {
        mocks.renovarSesion.mockRejectedValue(
            new Error("Sesión inválida"),
        );

        render(<App />);

        expect(
            await screen.findByText("Página de login"),
        ).toBeTruthy();
    });

    it("permite iniciar sesión desde el formulario", async () => {
        mocks.renovarSesion.mockResolvedValue(null);

        render(<App />);

        await screen.findByText("Página de login");

        fireEvent.click(
            screen.getByRole("button", { name: "Simular login" }),
        );

        expect(
            await screen.findByText("Equipos - gestión"),
        ).toBeTruthy();
    });

    it("permite navegar a Servicios", async () => {
        render(<App />);

        await screen.findByText("Equipos - gestión");

        fireEvent.click(
            screen.getByRole("button", { name: "Servicios" }),
        );

        expect(
            screen.getByText("Servicios - gestión"),
        ).toBeTruthy();
    });

    it("permite a ADMIN acceder a Cuadrillas", async () => {
        render(<App />);

        await screen.findByText("Equipos - gestión");

        fireEvent.click(
            screen.getByRole("button", { name: "Cuadrillas" }),
        );

        expect(
            screen.getByText("Gestión de cuadrillas"),
        ).toBeTruthy();
    });

    it("restringe la gestión a TEC", async () => {
        mocks.renovarSesion.mockResolvedValue(tecnico);

        render(<App />);

        expect(
            await screen.findByText("Equipos - consulta"),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: "Servicios" }),
        );

        expect(
            screen.getByText("Servicios - consulta"),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: "Cuadrillas" }),
        );

        expect(
            screen.queryByText("Gestión de cuadrillas"),
        ).toBeNull();
    });

    it("permite a GTE_OPE gestionar catálogos", async () => {
        mocks.renovarSesion.mockResolvedValue(gerente);

        render(<App />);

        expect(
            await screen.findByText("Equipos - gestión"),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: "Cuadrillas" }),
        );

        expect(
            screen.getByText("Gestión de cuadrillas"),
        ).toBeTruthy();
    });

    it("cierra sesión correctamente", async () => {
        render(<App />);

        await screen.findByText("Equipos - gestión");

        fireEvent.click(
            screen.getByRole("button", { name: "Cerrar sesión" }),
        );

        await waitFor(() => {
            expect(mocks.cerrarSesion).toHaveBeenCalledTimes(1);
        });

        expect(
            await screen.findByText("Página de login"),
        ).toBeTruthy();
    });

    it("cierra la interfaz aunque falle el logout del servidor", async () => {
        mocks.cerrarSesion.mockRejectedValue(
            new Error("Error de red"),
        );

        render(<App />);

        await screen.findByText("Equipos - gestión");

        fireEvent.click(
            screen.getByRole("button", { name: "Cerrar sesión" }),
        );

        expect(
            await screen.findByText("Página de login"),
        ).toBeTruthy();
    });

    it("limpia el usuario cuando expira la sesión", async () => {
        render(<App />);

        await screen.findByText("Equipos - gestión");

        window.dispatchEvent(
            new Event("trackon:session-expired"),
        );

        expect(
            await screen.findByText("Página de login"),
        ).toBeTruthy();
    });
});
