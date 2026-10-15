import { beforeEach, describe, expect, it, vi } from "vitest";
import { cambiarEstadoCliente, cambiarEstadoUbicacion, crearCliente, crearUbicacion,
    listarClientes, listarUbicacionesCliente } from "../src/features/clientes/clientes.api";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../src/shared/api", () => mocks);

beforeEach(() => { vi.resetAllMocks(); mocks.api.mockResolvedValue({}); });

describe("API de clientes y ubicaciones", () => {
    it("consulta los clientes", async () => {
        await listarClientes();
        expect(mocks.api).toHaveBeenCalledWith("/api/clientes");
    });

    it("crea una persona natural", async () => {
        const datos = { tipo: "NATURAL" as const, codigo: "CLI-001", persona: {
            firstName: "Ana", firstLastName: "Prueba", typeDocument: "PASAPORTE" as const,
            numberDocument: "AB123456",
        } };
        await crearCliente(datos);
        expect(mocks.api).toHaveBeenCalledWith("/api/clientes", {
            method: "POST", body: JSON.stringify(datos),
        });
    });

    it("crea una persona jurídica", async () => {
        const datos = { tipo: "EMPRESA" as const, codigo: "CLI-002", organizacion: {
            razonSocial: "Clínica Prueba S.A.", identificacionTributaria: "J1234567890123",
        } };
        await crearCliente(datos);
        expect(mocks.api).toHaveBeenCalledWith("/api/clientes", {
            method: "POST", body: JSON.stringify(datos),
        });
    });

    it("cambia el estado de un cliente", async () => {
        await cambiarEstadoCliente(4, false);
        expect(mocks.api).toHaveBeenCalledWith("/api/clientes/4/estado", {
            method: "PATCH", body: JSON.stringify({ activo: false }),
        });
    });

    it("solicita solo ubicaciones del cliente indicado", async () => {
        await listarUbicacionesCliente(8, 2);
        const uri = String(mocks.api.mock.calls[0]?.[0]);
        expect(uri.startsWith("/api/ubicaciones?")).toBe(true);
        const query = new URLSearchParams(uri.split("?")[1]);
        expect(query.get("clienteId")).toBe("8");
        expect(query.get("pagina")).toBe("2");
        expect(query.get("estado")).toBe("todos");
    });

    it("crea una ubicación vinculada a un cliente", async () => {
        const datos = { clienteId: 9, nombre: "Sucursal", direccion: "Managua" };
        await crearUbicacion(datos);
        expect(mocks.api).toHaveBeenCalledWith("/api/ubicaciones", {
            method: "POST", body: JSON.stringify(datos),
        });
    });

    it("cambia el estado de una ubicación", async () => {
        await cambiarEstadoUbicacion(12, true);
        expect(mocks.api).toHaveBeenCalledWith("/api/ubicaciones/12/estado", {
            method: "PATCH", body: JSON.stringify({ activa: true }),
        });
    });
});
