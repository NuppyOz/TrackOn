import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import type { UsuarioSesion } from "../src/features/auth/auth.api";

const mocks = vi.hoisted(() => ({ renovarSesion: vi.fn(), cerrarSesion: vi.fn() }));

vi.mock("../src/features/auth/auth.api", () => ({
    renovarSesion: mocks.renovarSesion,
    cerrarSesion: mocks.cerrarSesion,
    puedeAdministrarCatalogos: (rol: string) => rol === "ADMIN" || rol === "GTE_OPE",
}));
vi.mock("../src/features/auth/LoginPage", () => ({ default: () => <div>Página de login</div> }));
vi.mock("../src/features/notificaciones/NotificationsBell", () => ({ default: () => <div>Notificaciones</div> }));
vi.mock("../src/features/agenda/Agenda", () => ({ default: () => <div>Módulo agenda</div> }));
vi.mock("../src/features/dashboard/Dashboard", () => ({ default: () => <div>Módulo dashboard</div> }));
vi.mock("../src/features/materiales/MaterialesManager", () => ({ default: () => <div>Módulo materiales</div> }));
vi.mock("../src/features/clientes/ClientesManager", () => ({ default: () => <div>Módulo clientes</div> }));
vi.mock("../src/features/equipos/EquiposManager", () => ({ default: () => <div>Módulo equipos</div> }));
vi.mock("../src/features/servicios/ServiciosManager", () => ({ default: () => <div>Módulo servicios</div> }));
vi.mock("../src/features/empleados/EmpleadosManager", () => ({ default: () => <div>Módulo empleados</div> }));
vi.mock("../src/features/ordenes/OrdenesManager", () => ({ default: () => <div>Módulo órdenes</div> }));
vi.mock("../src/features/cuadrillas/CuadrillasManager", () => ({ default: () => <div>Módulo cuadrillas</div> }));
vi.mock("../src/features/administracion/UsuariosManager", () => ({ default: () => <div>Módulo usuarios</div> }));
vi.mock("../src/features/administracion/AuditoriaManager", () => ({ default: () => <div>Módulo auditoría</div> }));

const secciones = ["agenda", "administracion", "auditoria", "dashboard", "materiales", "clientes", "empleados", "equipos", "servicios", "ordenes", "cuadrillas"] as const;

vi.mock("../src/shared/layout/MainLayout", () => ({
    MainLayout: ({ children, onNavigate }: { children: React.ReactNode; onNavigate: (seccion: string) => void }) => (
        <div>
            <nav>
                {["agenda", "administracion", "auditoria", "dashboard", "materiales", "clientes", "empleados", "equipos", "servicios", "ordenes", "cuadrillas"].map(seccion => (
                    <button key={seccion} type="button" onClick={() => onNavigate(seccion)}>{`Ir a ${seccion}`}</button>
                ))}
            </nav>
            <main>{children}</main>
        </div>
    ),
}));

const admin: UsuarioSesion = {
    id: 1, identificador: "admin.trackon", rol: { cod: "ADMIN", nombre: "Administrador" },
    empleado: { persona: { firstName: "Usuario", firstLastName: "Admin" } },
};
const tecnico: UsuarioSesion = {
    id: 2, identificador: "tecnico.trackon", rol: { cod: "TEC", nombre: "Técnico" },
    empleado: { persona: { firstName: "Técnico", firstLastName: "Uno" } },
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.renovarSesion.mockResolvedValue(admin);
    window.history.replaceState({}, "", "/equipos");
});

afterEach(cleanup);

describe("App · recorrido por todos los módulos", () => {
    it("el administrador entra a cada módulo del menú", async () => {
        render(<App />);
        expect(await screen.findByText("Módulo equipos")).toBeTruthy();

        const esperados: Record<string, string> = {
            agenda: "Módulo agenda",
            administracion: "Módulo usuarios",
            auditoria: "Módulo auditoría",
            dashboard: "Módulo dashboard",
            materiales: "Módulo materiales",
            clientes: "Módulo clientes",
            empleados: "Módulo empleados",
            equipos: "Módulo equipos",
            servicios: "Módulo servicios",
            ordenes: "Módulo órdenes",
            cuadrillas: "Módulo cuadrillas",
        };

        for (const seccion of secciones) {
            fireEvent.click(screen.getByRole("button", { name: `Ir a ${seccion}` }));
            expect(await screen.findByText(esperados[seccion])).toBeTruthy();
        }
    });

    it("el técnico no entra a administración ni auditoría", async () => {
        mocks.renovarSesion.mockResolvedValue(tecnico);
        render(<App />);
        expect(await screen.findByText("Módulo equipos")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Ir a administracion" }));
        expect(screen.getByText("Módulo equipos")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Ir a auditoria" }));
        expect(screen.getByText("Módulo equipos")).toBeTruthy();
    });

    it("el técnico no entra a los módulos de gestión", async () => {
        mocks.renovarSesion.mockResolvedValue(tecnico);
        render(<App />);
        expect(await screen.findByText("Módulo equipos")).toBeTruthy();

        for (const seccion of ["dashboard", "cuadrillas", "empleados"]) {
            fireEvent.click(screen.getByRole("button", { name: `Ir a ${seccion}` }));
            expect(screen.getByText("Módulo equipos")).toBeTruthy();
        }

        fireEvent.click(screen.getByRole("button", { name: "Ir a materiales" }));
        expect(await screen.findByText("Módulo materiales")).toBeTruthy();
    });
});
