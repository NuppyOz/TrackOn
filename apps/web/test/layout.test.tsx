import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
        expect(screen.getByText("Managua Central")).toBeTruthy();
        expect(screen.getByText("Usuario de prueba")).toBeTruthy();
        expect(screen.getByText("Administrador")).toBeTruthy();
        expect(screen.getByText("Acción especial")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
        fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
        expect(onOpenMenu).toHaveBeenCalledTimes(1);
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it("presenta Resumen general e Inteligencia como último subsistema del administrador", () => {
        const onNavigate = vi.fn();
        render(<Sidebar seccion="inteligencia" abierto puedeGestionarCuadrillas puedeAdministrar onNavigate={onNavigate} />);
        const sidebar = document.querySelector('aside')!;
        const opciones = within(sidebar).getAllByRole('button', { hidden: true });
        expect(opciones[0].textContent).toContain('Resumen general');
        expect(within(sidebar).getByRole('navigation', {name: 'Inteligencia y control', hidden: true}).textContent).toContain('IA y negocio');
        expect(within(sidebar).getByRole('navigation', { name: 'Gestión comercial y clientes', hidden: true })).toBeTruthy();
        expect(within(sidebar).getByRole('navigation', { name: 'Inteligencia y control', hidden: true })).toBeTruthy();
        fireEvent.click(within(sidebar).getByRole('button', { name: 'IA y negocio', hidden: true }));
        expect(onNavigate).toHaveBeenCalledWith('inteligencia');
    });

    it("marca la sección seleccionada y permite navegar a los catálogos", () => {
        const onNavigate = vi.fn();
        render(<Sidebar
            seccion="servicios"
            abierto={false}
            puedeGestionarCuadrillas
            onNavigate={onNavigate}
        />);
        expect(screen.getByRole("button", { name: /Tipos de servicio/, hidden: true }).classList.contains("selected")).toBe(true);
        fireEvent.click(screen.getByRole("button", { name: /Equipos/, hidden: true }));
        fireEvent.click(screen.getByRole("button", { name: /Cuadrillas/, hidden: true }));
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
        expect(screen.getByRole("button", { name: /Equipos/, hidden: true }).classList.contains("selected")).toBe(true);
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
        fireEvent.click(screen.getByRole("button", { name: /Tipos de servicio/, hidden: true }));
        expect(onNavigate).toHaveBeenCalledWith("servicios");
        expect(screen.getByRole("button", { name: /Cuadrillas/, hidden: true }).classList.contains("selected")).toBe(true);
    });
});
