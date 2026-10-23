import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PortalCuentasPage } from "../src/features/comercial/portal-cuentas/PortalCuentasPage";

const mocks = vi.hoisted(() => ({ api: vi.fn(), listarClientes: vi.fn() }));
vi.mock("../src/shared/api", () => ({ api: mocks.api }));
vi.mock("../src/features/clientes/clientes.api", () => ({ listarClientes: mocks.listarClientes }));
const client = { id: 3, codigo: "CLI-3", activo: true, persona: null, organizacion: { razonSocial: "Taller Central", nombreComercial: "Taller Central", identificacionTributaria: "x" } };
const account = { id: 8, clienteId: 3, identificador: "taller", activo: true, version: 2, creadaEn: "2026-10-20T12:00:00Z" };

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

describe("Administración de cuenta portal FE05", () => {
  it("consulta al seleccionar y recargar; crea cuenta y conserva el password fuera de UI tras éxito", async () => {
    mocks.listarClientes.mockResolvedValue([client]);
    let saved: typeof account | null = null;
    mocks.api.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") { saved = account; return Promise.resolve(account); }
      return Promise.resolve(saved);
    });
    render(<PortalCuentasPage puedeGestionar />);
    await screen.findByText("Sin cuenta de portal");
    const getUrl = "/api/comercial/clientes/3/cuenta-portal";
    expect(mocks.api).toHaveBeenCalledWith(getUrl);
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(mocks.api.mock.calls.filter(([url]) => url === getUrl)).toHaveLength(2));
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    fireEvent.change(screen.getByLabelText("Identificador"), { target: { value: "taller" } });
    const password = "Larga-clave-123";
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: password } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    await screen.findByText("taller", { selector: "h2" });
    expect(mocks.api).toHaveBeenCalledWith(getUrl, { method: "POST", body: JSON.stringify({ identificador: "taller", password }) });
    expect(screen.queryByDisplayValue(password)).toBeNull();
  });

  it("no carga cuentas cuando no recibe permiso explícito", async () => {
    render(<PortalCuentasPage />);
    expect(screen.getByRole("alert").textContent).toContain("No tienes permiso");
    expect(mocks.listarClientes).not.toHaveBeenCalled();
    expect(mocks.api).not.toHaveBeenCalled();
  });
});
