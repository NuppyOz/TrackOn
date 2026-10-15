import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MainLayout } from "../src/shared/layout/MainLayout";
import { Sidebar } from "../src/shared/layout/Sidebar";
import { Header } from "../src/shared/layout/Header";

afterEach(cleanup);

describe("Layout responsive de TrackOn", () => {
    it("renderiza la identidad institucional, el usuario y los botones de cabecera", () => {
        const onOpenMenu = vi.fn();
        const onLogout = vi.fn();
        render(<Header
            usuarioNombre="Usuario de prueba · Administrador"
            onOpenMenu={onOpenMenu}
            onLogout={onLogout}
            acciones={<span>Acción especial</span>}
        />);
        expect(screen.getByText("TrackOn")).toBeTruthy();
        expect(screen.getByText("Usuario de prueba")).toBeTruthy();
        expect(screen.getByText("Administrador")).toBeTruthy();
        expect(screen.getByText("Acción especial")).toBeTruthy();
        expect(screen.getByRole("img", { name: "MULTICAS" })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
        fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
        expect(onOpenMenu).toHaveBeenCalledTimes(1);
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("marca la sección seleccionada y permite navegar a los catálogos", () => {
        const onNavigate = vi.fn();
        render(<Sidebar
            seccion="servicios"
            abierto={false}
            puedeGestionarCuadrillas
            onNavigate={onNavigate}
        />);
        expect(screen.getByRole("button", { name: /Servicios/ }).classList.contains("selected")).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: /Equipos/ }));
        fireEvent.click(screen.getByRole("button", { name: /Cuadrillas/ }));
        expect(onNavigate).toHaveBeenNthCalledWith(1, "equipos");
        expect(onNavigate).toHaveBeenNthCalledWith(2, "cuadrillas");
    });

    it("oculta Cuadrillas al técnico y muestra el sidebar abierto", () => {
        render(<Sidebar
            seccion="equipos"
            abierto
            puedeGestionarCuadrillas={false}
            onNavigate={vi.fn()}
        />);
        expect(screen.queryByRole("button", { name: /Cuadrillas/ })).toBeNull();
        expect(document.querySelector("aside.sidebar--open")).not.toBeNull();
        expect(screen.getByRole("button", { name: /Equipos/ }).classList.contains("selected")).toBe(true);
    });

    it("renderiza el layout sin capa de fondo cuando el menú está cerrado", () => {
        render(<MainLayout
            usuarioNombre="Administrador"
            seccion="equipos"
            menuAbierto={false}
            puedeGestionarCuadrillas
            onNavigate={vi.fn()}
            onOpenMenu={vi.fn()}
            onCloseMenu={vi.fn()}
            onLogout={vi.fn()}
        ><p>Contenido de prueba</p></MainLayout>);
        expect(screen.getByText("Contenido de prueba")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Cerrar navegación" })).toBeNull();
        expect(document.querySelector(".workspace")).not.toBeNull();
    });

    it("abre el menú y cierra la navegación mediante el backdrop", () => {
        const onCloseMenu = vi.fn();
        const onNavigate = vi.fn();
        render(<MainLayout
            usuarioNombre="Gerente"
            seccion="cuadrillas"
            menuAbierto
            puedeGestionarCuadrillas
            onNavigate={onNavigate}
            onOpenMenu={vi.fn()}
            onCloseMenu={onCloseMenu}
            onLogout={vi.fn()}
        ><div>Operaciones</div></MainLayout>);
        expect(document.querySelector("aside.sidebar--open")).not.toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Cerrar navegación" }));
        expect(onCloseMenu).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole("button", { name: /Servicios/ }));
        expect(onNavigate).toHaveBeenCalledWith("servicios");
        expect(screen.getByRole("button", { name: /Cuadrillas/ }).classList.contains("selected")).toBe(true);
    });
});
