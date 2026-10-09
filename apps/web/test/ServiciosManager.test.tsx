
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";

import ServiciosManager from "../src/features/servicios/ServiciosManager";
import type { Servicio } from "../src/features/servicios/servicios.types";

const mocks = vi.hoisted(() => ({
    listarServicios: vi.fn(),
    crearServicio: vi.fn(),
    editarServicio: vi.fn(),
    cambiarEstadoServicio: vi.fn(),
}));

vi.mock("../src/features/servicios/servicios.api", () => mocks);

const servicio: Servicio = {
    id: 1,
    codigo: "SRV-001",
    nombre: "Mantenimiento preventivo",
    descripcion: "Limpieza y revisión",
    activo: true,
};

const pagina = (items: Servicio[] = [servicio]) => ({
    items,
    pagina: 1,
    limite: 25,
    hayMas: false,
});

async function cargarListado() {
    await screen.findByText("Mantenimiento preventivo");
}

function abrirFormulario() {
    fireEvent.click(
        screen.getByRole("button", { name: /\+ Crear servicio/ }),
    );
}

function llenarFormulario(
    codigo = "SRV-002",
    nombre = "Instalación",
) {
    fireEvent.change(screen.getByRole("textbox", { name: "Código" }), {
        target: { value: codigo },
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Nombre" }), {
        target: { value: nombre },
    });
}

beforeEach(() => {
    vi.resetAllMocks();

    mocks.listarServicios.mockResolvedValue(pagina());
    mocks.crearServicio.mockResolvedValue(servicio);
    mocks.editarServicio.mockResolvedValue(servicio);
    mocks.cambiarEstadoServicio.mockResolvedValue(servicio);
});

afterEach(() => {
    cleanup();
});

describe("Gestión de Servicios", () => {
    it("consulta el catálogo al cargar", async () => {
        render(<ServiciosManager />);

        await cargarListado();

        expect(mocks.listarServicios).toHaveBeenCalledWith("todos", "");
        expect(screen.getByText("SRV-001")).toBeTruthy();
        expect(screen.getByText("Limpieza y revisión")).toBeTruthy();
    });

    it("muestra el estado vacío", async () => {
        mocks.listarServicios.mockResolvedValue(pagina([]));

        render(<ServiciosManager />);

        expect(
            await screen.findByText("No hay servicios que coincidan."),
        ).toBeTruthy();
    });

    it("muestra errores al consultar", async () => {
        mocks.listarServicios.mockRejectedValue(
            new Error("Error de conexión"),
        );

        render(<ServiciosManager />);

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Error de conexión",
        );
    });

    it("filtra servicios por búsqueda y estado", async () => {
        render(<ServiciosManager />);

        await cargarListado();

        fireEvent.change(
            screen.getByRole("textbox", { name: "Buscar servicio" }),
            { target: { value: "mantenimiento" } },
        );

        fireEvent.change(
            screen.getByRole("combobox", { name: "Filtrar por estado" }),
            { target: { value: "activos" } },
        );

        fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

        await waitFor(() => {
            expect(mocks.listarServicios).toHaveBeenLastCalledWith(
                "activos",
                "mantenimiento",
            );
        });
    });

    it("permite abrir y cancelar el formulario", async () => {
        render(<ServiciosManager />);

        await cargarListado();
        abrirFormulario();

        expect(screen.getByText("Datos del servicio")).toBeTruthy();

        fireEvent.click(
            screen.getByRole("button", { name: /Servicios/ }),
        );

        expect(
            screen.getByRole("heading", { name: "Catálogo de servicios" }),
        ).toBeTruthy();
    });

    it("crea un servicio y actualiza el listado", async () => {
        render(<ServiciosManager />);

        await cargarListado();
        abrirFormulario();
        llenarFormulario();

        fireEvent.change(
            screen.getByRole("textbox", { name: "Descripción" }),
            { target: { value: "Servicio nuevo" } },
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Crear servicio" }),
        );

        await waitFor(() => {
            expect(mocks.crearServicio).toHaveBeenCalledWith({
                codigo: "SRV-002",
                nombre: "Instalación",
                descripcion: "Servicio nuevo",
            });
        });

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Servicio creado.",
        );
    });

    it("envía descripción nula cuando está vacía", async () => {
        render(<ServiciosManager />);

        await cargarListado();
        abrirFormulario();
        llenarFormulario();

        fireEvent.click(
            screen.getByRole("button", { name: "Crear servicio" }),
        );

        await waitFor(() => {
            expect(mocks.crearServicio).toHaveBeenCalledWith(
                expect.objectContaining({ descripcion: null }),
            );
        });
    });

    it("edita un servicio existente", async () => {
        render(<ServiciosManager />);

        await cargarListado();

        fireEvent.click(
            screen.getByRole("button", { name: "Ver / editar" }),
        );

        fireEvent.change(
            screen.getByRole("textbox", { name: "Nombre" }),
            { target: { value: "Mantenimiento actualizado" } },
        );

        fireEvent.click(
            screen.getByRole("button", { name: "Guardar cambios" }),
        );

        await waitFor(() => {
            expect(mocks.editarServicio).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    nombre: "Mantenimiento actualizado",
                }),
            );
        });

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Servicio actualizado.",
        );
    });

    it("muestra errores al guardar", async () => {
        mocks.crearServicio.mockRejectedValue(
            new Error("Código duplicado"),
        );

        render(<ServiciosManager />);

        await cargarListado();
        abrirFormulario();
        llenarFormulario();

        fireEvent.click(
            screen.getByRole("button", { name: "Crear servicio" }),
        );

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Código duplicado",
        );

        expect(
            screen.getByRole("textbox", { name: "Código" }),
        ).toBeTruthy();
    });

    it("desactiva un servicio", async () => {
        render(<ServiciosManager />);

        await cargarListado();

        fireEvent.click(
            screen.getByRole("button", { name: "Desactivar" }),
        );

        await waitFor(() => {
            expect(mocks.cambiarEstadoServicio).toHaveBeenCalledWith(
                1,
                false,
            );
        });

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Servicio desactivado.",
        );
    });

    it("reactiva un servicio", async () => {
        mocks.listarServicios.mockResolvedValue(
            pagina([{ ...servicio, activo: false }]),
        );

        render(<ServiciosManager />);

        await screen.findByText("Inactivo");

        fireEvent.click(
            screen.getByRole("button", { name: "Activar" }),
        );

        await waitFor(() => {
            expect(mocks.cambiarEstadoServicio).toHaveBeenCalledWith(
                1,
                true,
            );
        });
    });

    it("muestra errores al cambiar estado", async () => {
        mocks.cambiarEstadoServicio.mockRejectedValue(
            new Error("Operación denegada"),
        );

        render(<ServiciosManager />);

        await cargarListado();

        fireEvent.click(
            screen.getByRole("button", { name: "Desactivar" }),
        );

        expect(await screen.findByRole("alert")).toHaveProperty(
            "textContent",
            "Operación denegada",
        );
    });

    it("permite consultar pero no gestionar cuando el rol es TEC", async () => {
        render(<ServiciosManager puedeGestionar={false} />);

        await cargarListado();

        expect(screen.getByText("SRV-001")).toBeTruthy();

        expect(
            screen.queryByRole("button", { name: /\+ Crear servicio/ }),
        ).toBeNull();

        expect(
            screen.queryByRole("button", { name: "Ver / editar" }),
        ).toBeNull();

        expect(
            screen.queryByRole("button", { name: "Desactivar" }),
        ).toBeNull();
    });

    it("muestra servicios sin descripción", async () => {
        mocks.listarServicios.mockResolvedValue(
            pagina([{ ...servicio, descripcion: null }]),
        );

        render(<ServiciosManager />);

        expect(
            await screen.findByText("Sin descripción"),
        ).toBeTruthy();
    });
});
