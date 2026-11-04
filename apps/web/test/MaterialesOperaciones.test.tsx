import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MaterialesManager from "../src/features/materiales/MaterialesManager";

const mocks = vi.hoisted(() => ({ listar: vi.fn(), crear: vi.fn(), editar: vi.fn(), estado: vi.fn() }));

vi.mock("../src/features/materiales/materiales.api", () => ({
    listarMateriales: mocks.listar,
    crearMaterial: mocks.crear,
    editarMaterial: mocks.editar,
    cambiarEstadoMaterial: mocks.estado,
}));

const activo = { id: 1, codigo: "REF", nombre: "Refrigerante", unidadMedida: "kg", activo: true };
const inactivo = { id: 2, codigo: "ACE", nombre: "Aceite", unidadMedida: "litro", activo: false };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listar.mockResolvedValue({ items: [activo, inactivo], hayMas: false });
});

afterEach(cleanup);

function llenarFormulario(codigo = "TUBO", nombre = "Tubo de cobre", unidad = "metro") {
    fireEvent.change(screen.getByLabelText("Código *"), { target: { value: codigo } });
    fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: nombre } });
    fireEvent.change(screen.getByLabelText("Unidad de medida *"), { target: { value: unidad } });
}

describe("Materiales · operaciones de gestión", () => {
    it("avisa cuando el catálogo no se puede cargar", async () => {
        mocks.listar.mockRejectedValueOnce(new Error("Catálogo caído"));
        const primero = render(<MaterialesManager puedeGestionar />);
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Catálogo caído");
        primero.unmount();

        mocks.listar.mockRejectedValueOnce("sin detalle");
        render(<MaterialesManager puedeGestionar />);
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "No se pudieron cargar los materiales.");
    });

    it("busca desde el formulario de filtros y vuelve a la primera página", async () => {
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.change(screen.getByLabelText("Buscar material"), { target: { value: "ace" } });
        const formulario = screen.getByLabelText("Buscar material").closest("form")!;
        fireEvent.submit(formulario);

        await waitFor(() => expect(mocks.listar).toHaveBeenLastCalledWith("activos", "ace", 1));
    });

    it("registra un material y confirma el resultado", async () => {
        mocks.crear.mockResolvedValue(activo);
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getByRole("button", { name: /Registrar material/ }));
        expect(screen.getByRole("heading", { name: "Registrar material" })).toBeTruthy();
        llenarFormulario();
        fireEvent.submit(screen.getByLabelText("Código *").closest("form")!);

        expect(await screen.findByRole("status")).toHaveProperty("textContent", "Material guardado correctamente.");
        expect(mocks.crear).toHaveBeenCalledWith({ codigo: "TUBO", nombre: "Tubo de cobre", unidadMedida: "metro" });
        await waitFor(() => expect(screen.getByRole("heading", { name: "Materiales" })).toBeTruthy());
    });

    it("informa el error genérico cuando guardar falla sin mensaje", async () => {
        mocks.crear.mockRejectedValueOnce("sin detalle");
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getByRole("button", { name: /Registrar material/ }));
        llenarFormulario();
        fireEvent.submit(screen.getByLabelText("Código *").closest("form")!);

        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "No se pudo guardar el material.");
    });

    it("edita un material existente", async () => {
        mocks.editar.mockResolvedValue(activo);
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);

        expect(screen.getByRole("heading", { name: "Editar material" })).toBeTruthy();
        expect((screen.getByLabelText("Código *") as HTMLInputElement).value).toBe("REF");
        fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Refrigerante R410" } });
        fireEvent.submit(screen.getByLabelText("Código *").closest("form")!);

        expect(await screen.findByRole("status")).toHaveProperty("textContent", "Material guardado correctamente.");
        expect(mocks.editar).toHaveBeenCalledWith(1, { codigo: "REF", nombre: "Refrigerante R410", unidadMedida: "kg" });
    });

    it("cancela el formulario y vuelve al listado", async () => {
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getByRole("button", { name: /Registrar material/ }));
        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(screen.getByRole("heading", { name: "Materiales" })).toBeTruthy();
        expect(screen.queryByLabelText("Código *")).toBeNull();
    });

    it("desactiva un material después de confirmar", async () => {
        mocks.estado.mockResolvedValue({ ...activo, activo: false });
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
        expect(screen.getByRole("heading", { name: "Desactivar Refrigerante" })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

        expect(await screen.findByRole("status")).toHaveProperty("textContent", "Estado del material actualizado.");
        expect(mocks.estado).toHaveBeenCalledWith(1, false);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("activa un material inactivo", async () => {
        mocks.estado.mockResolvedValue({ ...inactivo, activo: true });
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Aceite");

        fireEvent.click(screen.getByRole("button", { name: "Activar" }));
        expect(screen.getByRole("heading", { name: "Activar Aceite" })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

        await waitFor(() => expect(mocks.estado).toHaveBeenCalledWith(2, true));
    });

    it("no cambia el estado si se cancela la confirmación", async () => {
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");

        fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(mocks.estado).not.toHaveBeenCalled();
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("informa el error al cambiar el estado con y sin mensaje", async () => {
        mocks.estado.mockRejectedValueOnce(new Error("Material en uso"));
        const primero = render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");
        fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
        fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Material en uso");
        primero.unmount();

        mocks.estado.mockRejectedValueOnce("sin detalle");
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");
        fireEvent.click(screen.getAllByRole("button", { name: "Desactivar" })[0]);
        fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "No se pudo actualizar el estado.");
    });

    it("pagina los resultados y marca los inactivos", async () => {
        mocks.listar.mockResolvedValue({ items: [activo, inactivo], hayMas: true });
        render(<MaterialesManager puedeGestionar />);
        await screen.findByText("Refrigerante");
        expect(screen.getAllByText("Activo").length).toBe(1);
        expect(screen.getAllByText("Inactivo").length).toBe(1);

        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

        await waitFor(() => expect(mocks.listar).toHaveBeenLastCalledWith("activos", "", 2));
    });
});
