
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";

import LoginPage from "../src/features/auth/LoginPage";
import type { UsuarioSesion } from "../src/features/auth/auth.api";

const mocks = vi.hoisted(() => ({
    iniciarSesion: vi.fn(),
}));

vi.mock("../src/features/auth/auth.api", () => mocks);

const usuario: UsuarioSesion = {
    id: 1,
    identificador: "administrador.trackon",
    rol: {
        cod: "ADMIN",
        nombre: "Administrador",
    },
    empleado: {
        persona: {
            firstName: "Usuario",
            firstLastName: "Prueba",
        },
    },
};

function escribirCredenciales() {
    fireEvent.change(
        screen.getByRole("textbox", { name: "Usuario" }),
        { target: { value: "administrador.trackon" } },
    );

    fireEvent.change(screen.getByLabelText("Contraseña"), {
        target: { value: "clave-prueba" },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.iniciarSesion.mockResolvedValue(usuario);
});

afterEach(() => {
    cleanup();
});

describe("Login de TrackOn", () => {
    it("muestra el formulario", () => {
        render(<LoginPage onLogin={vi.fn()} />);

        expect(
            screen.getByRole("heading", { name: "Iniciar sesión" }),
        ).toBeTruthy();

        expect(
            screen.getByRole("textbox", { name: "Usuario" }),
        ).toBeTruthy();

        expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    });

    it("permite mostrar y ocultar la contraseña", () => {
        render(<LoginPage onLogin={vi.fn()} />);

        const password = screen.getByLabelText("Contraseña");

        expect(password).toHaveProperty("type", "password");

        fireEvent.click(
            screen.getByRole("button", { name: "Mostrar contraseña" }),
        );

        expect(password).toHaveProperty("type", "text");

        fireEvent.click(
            screen.getByRole("button", { name: "Ocultar contraseña" }),
        );

        expect(password).toHaveProperty("type", "password");
    });

    it("inicia sesión y comunica el usuario autenticado", async () => {
        const onLogin = vi.fn();

        render(<LoginPage onLogin={onLogin} />);

        escribirCredenciales();

        fireEvent.click(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        );

        await waitFor(() => {
            expect(mocks.iniciarSesion).toHaveBeenCalledWith(
                "administrador.trackon",
                "clave-prueba",
            );
        });

        await waitFor(() => {
            expect(onLogin).toHaveBeenCalledWith(usuario);
        });
    });

    it("muestra errores de autenticación", async () => {
        mocks.iniciarSesion.mockRejectedValue(
            new Error("Credenciales incorrectas"),
        );

        render(<LoginPage onLogin={vi.fn()} />);

        escribirCredenciales();

        fireEvent.click(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        );

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Credenciales incorrectas",
        );
    });

    it("no llama a la API con campos vacíos", () => {
        const onLogin = vi.fn();

        render(<LoginPage onLogin={onLogin} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        );

        expect(mocks.iniciarSesion).not.toHaveBeenCalled();
        expect(onLogin).not.toHaveBeenCalled();
    });

    it("bloquea el formulario durante el envío", async () => {
        let resolver!: (value: UsuarioSesion) => void;

        mocks.iniciarSesion.mockReturnValue(
            new Promise<UsuarioSesion>(resolve => {
                resolver = resolve;
            }),
        );

        const onLogin = vi.fn();

        render(<LoginPage onLogin={onLogin} />);

        escribirCredenciales();

        fireEvent.click(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        );

        expect(
            screen.getByRole("button", { name: "Ingresando…" }),
        ).toHaveProperty("disabled", true);

        expect(
            screen.getByRole("textbox", { name: "Usuario" }),
        ).toHaveProperty("disabled", true);

        resolver(usuario);

        await waitFor(() => {
            expect(onLogin).toHaveBeenCalledWith(usuario);
        });
    });

    it("habilita nuevamente el formulario después de un error", async () => {
        mocks.iniciarSesion.mockRejectedValue(
            new Error("Servidor no disponible"),
        );

        render(<LoginPage onLogin={vi.fn()} />);

        escribirCredenciales();

        fireEvent.click(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        );

        await screen.findByRole("alert");

        expect(
            screen.getByRole("button", { name: "Iniciar sesión" }),
        ).toHaveProperty("disabled", false);
    });
});
