import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccountMenu } from "../src/shared/layout/AccountMenu";

afterEach(cleanup);

const USUARIO = "Wilhelm Reyes · Administrador";

function abrirPorClick() {
    const disparador = screen.getByRole("button", { name: /Menú de cuenta de Wilhelm Reyes/ });
    fireEvent.click(disparador);
    return disparador;
}

describe("Menú de cuenta del avatar", () => {
    it("expone la cuenta como botón de menú y permanece cerrado al inicio", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        const disparador = screen.getByRole("button", { name: "Menú de cuenta de Wilhelm Reyes" });
        expect(disparador.getAttribute("aria-haspopup")).toBe("menu");
        expect(disparador.getAttribute("aria-expanded")).toBe("false");
        expect(disparador.getAttribute("aria-controls")).toBeNull();
        expect(screen.getByText("Wilhelm Reyes")).toBeTruthy();
        expect(screen.getByText("Administrador")).toBeTruthy();
        expect(screen.getByText("WR")).toBeTruthy();
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("abre el menú con un clic y deja el foco en la opción", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        const disparador = abrirPorClick();
        const opcion = screen.getByRole("menuitem", { name: "Cerrar sesión" });

        expect(disparador.getAttribute("aria-expanded")).toBe("true");
        expect(disparador.getAttribute("aria-controls")).toBe(
            screen.getByRole("menu").id,
        );
        expect(document.activeElement).toBe(opcion);
    });

    it("cierra el menú al volver a pulsar el disparador", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        const disparador = abrirPorClick();
        fireEvent.click(disparador);

        expect(screen.queryByRole("menu")).toBeNull();
        expect(disparador.getAttribute("aria-expanded")).toBe("false");
    });

    it("confirma la salida solo cuando se elige la opción y devuelve el foco", () => {
        const onLogout = vi.fn();
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={onLogout} />);

        const disparador = abrirPorClick();
        fireEvent.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));

        expect(onLogout).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).toBeNull();
        expect(document.activeElement).toBe(disparador);
    });

    it("abre el menú con las flechas del disparador", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);
        const disparador = screen.getByRole("button", { name: /Menú de cuenta/ });

        fireEvent.keyDown(disparador, { key: "ArrowDown" });
        expect(screen.getByRole("menu")).toBeTruthy();

        fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Escape" });
        expect(screen.queryByRole("menu")).toBeNull();

        fireEvent.keyDown(disparador, { key: "ArrowUp" });
        expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("recorre las opciones con flechas, Inicio y Fin", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        abrirPorClick();
        const opcion = screen.getByRole("menuitem", { name: "Cerrar sesión" });

        for (const tecla of ["ArrowDown", "ArrowUp", "Home", "End"]) {
            fireEvent.keyDown(opcion, { key: tecla });
            expect(document.activeElement).toBe(opcion);
        }
    });

    it("cierra el menú con Escape y restaura el foco en el disparador", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        const disparador = abrirPorClick();
        fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Escape" });

        expect(screen.queryByRole("menu")).toBeNull();
        expect(document.activeElement).toBe(disparador);
    });

    it("cierra el menú al tabular fuera de él", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        const disparador = abrirPorClick();
        fireEvent.keyDown(screen.getByRole("menuitem"), { key: "Tab" });

        expect(screen.queryByRole("menu")).toBeNull();
        expect(document.activeElement).toBe(disparador);
    });

    it("ignora otras teclas dentro del menú", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        abrirPorClick();
        const opcion = screen.getByRole("menuitem", { name: "Cerrar sesión" });
        fireEvent.keyDown(opcion, { key: "Enter" });

        expect(screen.getByRole("menu")).toBeTruthy();
        expect(document.activeElement).toBe(opcion);
    });

    it("se cierra al pulsar fuera del menú", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        abrirPorClick();
        expect(screen.getByRole("menu")).toBeTruthy();

        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("permanece abierto al pulsar dentro del propio menú", () => {
        render(<AccountMenu usuarioNombre={USUARIO} onLogout={vi.fn()} />);

        abrirPorClick();
        fireEvent.mouseDown(screen.getByRole("menu"));

        expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("usa valores por defecto cuando el nombre llega incompleto", () => {
        render(<AccountMenu usuarioNombre="Ana" onLogout={vi.fn()} />);

        expect(screen.getByText("Ana")).toBeTruthy();
        expect(screen.getByText("Usuario")).toBeTruthy();
        expect(screen.getByText("A")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Menú de cuenta de Ana" })).toBeTruthy();
    });

    it("muestra iniciales de respaldo si el nombre está vacío", () => {
        render(<AccountMenu usuarioNombre="" onLogout={vi.fn()} />);

        expect(screen.getByText("TR")).toBeTruthy();
        expect(screen.getByText("Usuario")).toBeTruthy();
    });
});
