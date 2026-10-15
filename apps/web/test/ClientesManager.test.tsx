import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ClientesManager from "../src/features/clientes/ClientesManager";
import type { Cliente, UbicacionCliente } from "../src/features/clientes/clientes.types";

const mocks = vi.hoisted(() => ({
    listarClientes: vi.fn(), crearCliente: vi.fn(), cambiarEstadoCliente: vi.fn(),
    listarUbicacionesCliente: vi.fn(), crearUbicacion: vi.fn(), cambiarEstadoUbicacion: vi.fn(),
}));
vi.mock("../src/features/clientes/clientes.api", () => mocks);

const empresa: Cliente = {
    id: 8, codigo: "CLI-008", activo: true, telefonoComercial: "22220000", correoComercial: null,
    persona: null, organizacion: {
        razonSocial: "Clínica Santa María S.A.", nombreComercial: null,
        identificacionTributaria: "J1234567890123",
    },
};
const persona: Cliente = {
    id: 9, codigo: "CLI-009", activo: false, telefonoComercial: null, correoComercial: null,
    persona: { firstName: "Ana", secondName: null, firstLastName: "López", secondLastName: null,
        typeDocument: "PASAPORTE", numberDocument: "AB12345", telephone: null, correo: null },
    organizacion: null,
};
const ubicacion: UbicacionCliente = {
    id: 15, clienteId: 8, nombre: "Sucursal Managua", direccion: "Barrio central, Managua",
    referencia: null, contactoNombre: null, contactoTelefono: null, activa: true,
};
const pagina = (items: UbicacionCliente[] = [ubicacion], hayMas = false) => ({
    items, pagina: 1, limite: 25, hayMas,
});

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarClientes.mockResolvedValue([empresa, persona]);
    mocks.listarUbicacionesCliente.mockResolvedValue(pagina());
    mocks.crearCliente.mockResolvedValue({ ...empresa, id: 10 });
    mocks.crearUbicacion.mockResolvedValue(ubicacion);
    mocks.cambiarEstadoCliente.mockResolvedValue({ ...empresa, activo: false });
    mocks.cambiarEstadoUbicacion.mockResolvedValue({ ...ubicacion, activa: false });
});
afterEach(() => { cleanup(); });

async function abrirRegistro() {
    await screen.findByText("Clínica Santa María S.A.");
    fireEvent.click(screen.getByRole("button", { name: /Registrar cliente/ }));
}
async function abrirDetalle() {
    await screen.findByText("Clínica Santa María S.A.");
    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle" })[0]);
    await screen.findByText("Sucursal Managua");
}

describe("Clientes y ubicaciones en TrackOn", () => {
    it("carga clientes naturales y jurídicos", async () => {
        render(<ClientesManager puedeGestionar />);
        expect(await screen.findByText("Clínica Santa María S.A.")).toBeTruthy();
        expect(screen.getByText("Ana López")).toBeTruthy();
        expect(mocks.listarClientes).toHaveBeenCalledTimes(1);
    });

    it("filtra por nombre de cliente", async () => {
        render(<ClientesManager puedeGestionar />);
        await screen.findByText("Ana López");
        fireEvent.change(screen.getByRole("textbox", { name: "Buscar cliente" }), {
            target: { value: "Clínica" },
        });
        expect(screen.getByText("Clínica Santa María S.A.")).toBeTruthy();
        expect(screen.queryByText("Ana López")).toBeNull();
    });

    it("filtra por tipo y estado", async () => {
        render(<ClientesManager puedeGestionar />);
        await screen.findByText("Ana López");
        fireEvent.change(screen.getByRole("combobox", { name: "Filtrar tipo de cliente" }), {
            target: { value: "NATURAL" },
        });
        expect(screen.queryByText("Clínica Santa María S.A.")).toBeNull();
        fireEvent.change(screen.getByRole("combobox", { name: "Filtrar estado de cliente" }), {
            target: { value: "activos" },
        });
        expect(screen.getByText("No hay clientes que coincidan con los filtros.")).toBeTruthy();
    });

    it("muestra fallos de consulta", async () => {
        mocks.listarClientes.mockRejectedValue(new Error("Sin conexión"));
        render(<ClientesManager puedeGestionar />);
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Sin conexión");
    });

    it("permite abrir y cancelar el registro", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirRegistro();
        expect(screen.getByText("INFORMACIÓN PERSONAL")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
        expect(screen.getByRole("heading", { name: "Clientes" })).toBeTruthy();
    });

    it("cambia entre persona natural y empresa", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirRegistro();
        fireEvent.change(screen.getByRole("combobox", { name: "Tipo de cliente" }), {
            target: { value: "EMPRESA" },
        });
        expect(screen.getByText("INFORMACIÓN DE LA EMPRESA")).toBeTruthy();
        expect(screen.getByText("RUC *")).toBeTruthy();
    });

    it("registra una persona natural con datos válidos", async () => {
        mocks.crearCliente.mockResolvedValue({ ...persona, id: 10, activo: true });
        render(<ClientesManager puedeGestionar />);
        await abrirRegistro();
        fireEvent.change(screen.getByLabelText("Código del cliente *"), { target: { value: "cli-010" } });
        fireEvent.change(screen.getByLabelText("Primer nombre *"), { target: { value: "Ana" } });
        fireEvent.change(screen.getByLabelText("Primer apellido *"), { target: { value: "López" } });
        fireEvent.change(screen.getByLabelText("Tipo de documento *"), { target: { value: "PASAPORTE" } });
        fireEvent.change(screen.getByLabelText("Número de documento *"), { target: { value: "AB12345" } });
        fireEvent.click(screen.getByRole("button", { name: "Registrar cliente" }));
        await waitFor(() => expect(mocks.crearCliente).toHaveBeenCalledWith(expect.objectContaining({
            codigo: "CLI-010", tipo: "NATURAL",
            persona: expect.objectContaining({ numberDocument: "AB12345" }),
        })));
        expect(await screen.findByText("Cliente registrado correctamente. Ahora registra su ubicación.")).toBeTruthy();
    });

    it("registra una persona jurídica con RUC", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirRegistro();
        fireEvent.change(screen.getByLabelText("Tipo de cliente *"), { target: { value: "EMPRESA" } });
        fireEvent.change(screen.getByLabelText("Código del cliente *"), { target: { value: "cli-011" } });
        fireEvent.change(screen.getByLabelText("Razón social *"), { target: { value: "Clínica Santa María S.A." } });
        fireEvent.change(screen.getByLabelText("RUC *"), { target: { value: "J1234567890123" } });
        fireEvent.click(screen.getByRole("button", { name: "Registrar cliente" }));
        await waitFor(() => expect(mocks.crearCliente).toHaveBeenCalledWith(expect.objectContaining({
            codigo: "CLI-011", tipo: "EMPRESA",
            organizacion: expect.objectContaining({ identificacionTributaria: "J1234567890123" }),
        })));
    });

    it("conserva el formulario cuando el servidor rechaza el registro", async () => {
        mocks.crearCliente.mockRejectedValue(new Error("Código duplicado"));
        render(<ClientesManager puedeGestionar />);
        await abrirRegistro();
        fireEvent.change(screen.getByLabelText("Código del cliente *"), { target: { value: "CLI-001" } });
        fireEvent.change(screen.getByLabelText("Primer nombre *"), { target: { value: "Ana" } });
        fireEvent.change(screen.getByLabelText("Primer apellido *"), { target: { value: "López" } });
        fireEvent.change(screen.getByLabelText("Número de documento *"), { target: { value: "1234567890123A" } });
        fireEvent.click(screen.getByRole("button", { name: "Registrar cliente" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Código duplicado");
        expect(screen.getByLabelText("Código del cliente *")).toHaveProperty("value", "CLI-001");
    });

    it("consulta solo las ubicaciones del cliente seleccionado", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        expect(mocks.listarUbicacionesCliente).toHaveBeenCalledWith(8, 1);
    });

    it("registra una ubicación y la vincula con el cliente", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        fireEvent.click(screen.getByRole("button", { name: /Registrar ubicación/ }));
        fireEvent.change(screen.getByLabelText("Nombre de ubicación *"), { target: { value: "Sucursal Masaya" } });
        fireEvent.change(screen.getByLabelText("Dirección *"), { target: { value: "Masaya, Nicaragua" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar ubicación" }));
        await waitFor(() => expect(mocks.crearUbicacion).toHaveBeenCalledWith({
            clienteId: 8, nombre: "Sucursal Masaya", direccion: "Masaya, Nicaragua",
        }));
        expect(await screen.findByText("Ubicación registrada correctamente.")).toBeTruthy();
    });

    it("muestra errores si no se puede registrar una ubicación", async () => {
        mocks.crearUbicacion.mockRejectedValue(new Error("Dirección inválida"));
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        fireEvent.click(screen.getByRole("button", { name: /Registrar ubicación/ }));
        fireEvent.change(screen.getByLabelText("Nombre de ubicación *"), { target: { value: "Bodega" } });
        fireEvent.change(screen.getByLabelText("Dirección *"), { target: { value: "Masaya" } });
        fireEvent.click(screen.getByRole("button", { name: "Guardar ubicación" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Dirección inválida");
    });

    it("desactiva a un cliente", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        fireEvent.click(screen.getByRole("button", { name: "Desactivar cliente" }));
        await waitFor(() => expect(mocks.cambiarEstadoCliente).toHaveBeenCalledWith(8, false));
        expect(await screen.findByText("Cliente desactivado.")).toBeTruthy();
    });

    it("desactiva una ubicación", async () => {
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));
        await waitFor(() => expect(mocks.cambiarEstadoUbicacion).toHaveBeenCalledWith(15, false));
    });

    it("maneja errores de listado de ubicaciones", async () => {
        mocks.listarUbicacionesCliente.mockRejectedValue(new Error("Error al listar ubicaciones"));
        render(<ClientesManager puedeGestionar />);
        await screen.findByText("Clínica Santa María S.A.");
        fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle" })[0]);
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Error al listar ubicaciones");
    });

    it("pagina las ubicaciones", async () => {
        mocks.listarUbicacionesCliente.mockResolvedValue(pagina([ubicacion], true));
        render(<ClientesManager puedeGestionar />);
        await abrirDetalle();
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
        await waitFor(() => expect(mocks.listarUbicacionesCliente).toHaveBeenCalledWith(8, 2));
    });

    it("solo permite consultar a técnicos", async () => {
        render(<ClientesManager puedeGestionar={false} />);
        await screen.findByText("Clínica Santa María S.A.");
        expect(screen.queryByRole("button", { name: /Registrar cliente/ })).toBeNull();
        await abrirDetalle();
        expect(screen.queryByRole("button", { name: /Registrar ubicación/ })).toBeNull();
        expect(screen.queryByRole("button", { name: "Desactivar cliente" })).toBeNull();
    });
});
