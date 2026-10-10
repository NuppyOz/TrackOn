import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    cambiarEstadoServicio,
    crearServicio,
    editarServicio,
    listarServicios,
} from "../src/features/servicios/servicios.api";
import type { ServicioInput } from "../src/features/servicios/servicios.types";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../src/shared/api", () => ({ api: mocks.api }));

const datos: ServicioInput = {
    codigo: "SRV-015",
    nombre: "Mantenimiento preventivo",
    descripcion: null,
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.api.mockResolvedValue({ items: [] });
});

describe("API de Servicios", () => {
    it("solicita todos los servicios sin búsqueda vacía en la URL", async () => {
        await listarServicios("todos", "");
        expect(mocks.api).toHaveBeenCalledWith("/api/servicios?estado=todos");
    });

    it("codifica la búsqueda y el estado mediante URLSearchParams", async () => {
        await listarServicios("activos", "aire & frío");
        const url = mocks.api.mock.calls[0][0] as string;
        const params = new URL(url, "http://localhost").searchParams;
        expect(params.get("estado")).toBe("activos");
        expect(params.get("buscar")).toBe("aire & frío");
    });

    it("consulta servicios inactivos", async () => {
        await listarServicios("inactivos", "motor");
        const url = mocks.api.mock.calls[0][0] as string;
        const params = new URL(url, "http://localhost").searchParams;
        expect(params.get("estado")).toBe("inactivos");
        expect(params.get("buscar")).toBe("motor");
    });

    it("crea servicios mediante POST con los datos enviados", async () => {
        await crearServicio(datos);
        expect(mocks.api).toHaveBeenCalledWith("/api/servicios", {
            method: "POST",
            body: JSON.stringify(datos),
        });
    });

    it("edita servicios mediante PATCH", async () => {
        await editarServicio(15, datos);
        expect(mocks.api).toHaveBeenCalledWith("/api/servicios/15", {
            method: "PATCH",
            body: JSON.stringify(datos),
        });
    });

    it("desactiva un servicio mediante PATCH", async () => {
        await cambiarEstadoServicio(15, false);
        expect(mocks.api).toHaveBeenCalledWith("/api/servicios/15/estado", {
            method: "PATCH",
            body: JSON.stringify({ activo: false }),
        });
    });

    it("reactiva un servicio mediante PATCH", async () => {
        await cambiarEstadoServicio(15, true);
        expect(mocks.api).toHaveBeenCalledWith("/api/servicios/15/estado", {
            method: "PATCH",
            body: JSON.stringify({ activo: true }),
        });
    });

    it("propaga los errores HTTP de la capa compartida", async () => {
        mocks.api.mockRejectedValue(new Error("Acceso denegado"));
        await expect(listarServicios("todos", "")).rejects.toThrow("Acceso denegado");
    });
});
