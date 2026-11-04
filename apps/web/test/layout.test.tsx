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
        expect(screen.getByRole("button", { name: "Abrir navegación" }).getAttribute("aria-controls")).toBe("navegacion-principal");
        fireEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
        expect(onOpenMenu).toHaveBeenCalledTimes(1);
    });

    it("no deja un botón de salida suelto: la sesión se cierra desde el menú de la cuenta", () => {
        const onLogout = vi.fn();
        render(<Header
            usuarioNombre="Usuario de prueba · Administrador"
            onOpenMenu={vi.fn()}
            onLogout={onLogout}
        />);
        expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
        expect(screen.queryByRole("menuitem")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /Menú de cuenta de Usuario de prueba/ }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
        expect(onLogout).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).toBeNull();
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

    it("mantiene el menú desplazable con la barra oculta", () => {
        render(<Sidebar
            seccion="ordenes"
            abierto
            puedeGestionarCuadrillas
            onNavigate={vi.fn()}
        />);
        const navegacion = screen.getByRole("complementary");
        const desplazable = navegacion.querySelector(".sidebar-scroll");
        expect(navegacion.id).toBe("navegacion-principal");
        expect(desplazable).not.toBeNull();
        expect(desplazable?.classList.contains("figma-sidebar-groups")).toBe(true);
        expect(navegacion.querySelector(".figma-sidebar-footer")).not.toBeNull();
    });

    it("marca el botón del menú como expandido y lo cierra con Escape", () => {
        const onCloseMenu = vi.fn();
        render(<MainLayout
            usuarioNombre="Gerente · Administrador"
            seccion="equipos"
            menuAbierto
            puedeGestionarCuadrillas
            onNavigate={vi.fn()}
            onOpenMenu={vi.fn()}
            onCloseMenu={onCloseMenu}
            onLogout={vi.fn()}
        ><p>Contenido</p></MainLayout>);

        const disparador = screen.getByRole("button", { name: "Abrir navegación" });
        expect(disparador.getAttribute("aria-expanded")).toBe("true");

        fireEvent.keyDown(document, { key: "Escape" });

        expect(onCloseMenu).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(disparador);
    });

    it("expone el título de la sección como encabezado de nivel uno accesible", () => {
        render(<MainLayout
            usuarioNombre="Gerente · Administrador"
            seccion="ordenes"
            menuAbierto={false}
            puedeGestionarCuadrillas
            onNavigate={vi.fn()}
            onOpenMenu={vi.fn()}
            onCloseMenu={vi.fn()}
            onLogout={vi.fn()}
        ><p>Contenido</p></MainLayout>);

        const encabezado = screen.getByRole("heading", { level: 1, name: "Órdenes de trabajo" });
        expect(encabezado.className).toBe("sr-only");
        expect(screen.getByRole("main")).toBeTruthy();
    });

    it("no intercepta otras teclas cuando el menú lateral está cerrado", () => {
        const onCloseMenu = vi.fn();
        render(<MainLayout
            usuarioNombre="Gerente · Administrador"
            seccion="equipos"
            menuAbierto={false}
            puedeGestionarCuadrillas
            onNavigate={vi.fn()}
            onOpenMenu={vi.fn()}
            onCloseMenu={onCloseMenu}
            onLogout={vi.fn()}
        ><p>Contenido</p></MainLayout>);

        expect(screen.getByRole("button", { name: "Abrir navegación" }).getAttribute("aria-expanded")).toBe("false");
        fireEvent.keyDown(document, { key: "Escape" });
        fireEvent.keyDown(document, { key: "Tab" });
        expect(onCloseMenu).not.toHaveBeenCalled();
    });
});
