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

  it("muestra errores al consultar clientes y cuentas y permite reintentar", async () => {
    mocks.listarClientes.mockRejectedValueOnce(new Error("Clientes fuera de servicio"));
    render(<PortalCuentasPage puedeGestionar />);
    expect((await screen.findByRole("alert")).textContent).toContain("Clientes fuera de servicio");
    cleanup();
    mocks.listarClientes.mockResolvedValue([client]);
    mocks.api.mockRejectedValueOnce(new Error("Cuenta no disponible")).mockResolvedValue(null);
    render(<PortalCuentasPage puedeGestionar />);
    expect(await screen.findByRole("heading", { name: "No se pudo cargar la cuenta" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Sin cuenta de portal" })).toBeTruthy();
  });

  it("permite cambiar el cliente y crear cuenta solo para clientes activos", async () => {
    const inactive = { ...client, id: 4, activo: false, organizacion: { ...client.organizacion, razonSocial: "Cliente inactivo" } };
    mocks.listarClientes.mockResolvedValue([client, inactive]);
    mocks.api.mockResolvedValue(null);
    render(<PortalCuentasPage puedeGestionar />);
    await screen.findByRole("heading", { name: "Sin cuenta de portal" });
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "4" } });
    expect(await screen.findByText("Activa al cliente antes de crear una cuenta.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Crear cuenta" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Cliente"), { target: { value: "3" } });
    await screen.findByText("Crea un acceso para que este cliente consulte sus cotizaciones.");
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    fireEvent.change(screen.getByLabelText("Identificador"), { target: { value: "bad id" } });
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "corta" } });
    expect((screen.getByRole("button", { name: "Crear cuenta" }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.api).toHaveBeenCalledTimes(3);
  });

  it("restablece password y cambia estado solo tras confirmación", async () => {
    mocks.listarClientes.mockResolvedValue([client]);
    let current = account;
    mocks.api.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") current = { ...account, activo: false };
      return Promise.resolve(current);
    });
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<PortalCuentasPage puedeGestionar />);
    await screen.findByText("taller", { selector: "h2" });
    fireEvent.click(screen.getByRole("button", { name: "Desactivar acceso" }));
    await screen.findByText(/Acceso desactivado/);
    expect(mocks.api).toHaveBeenCalledWith("/api/comercial/clientes/3/cuenta-portal", { method: "PATCH", body: JSON.stringify({ version: 2, activo: false }) });
    fireEvent.click(screen.getByRole("button", { name: "Restablecer contraseña" }));
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "otra-clave-segura-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith("/api/comercial/clientes/3/cuenta-portal/restablecer", { method: "POST", body: JSON.stringify({ version: 2, password: "otra-clave-segura-123" }) }));
    expect(screen.queryByDisplayValue("otra-clave-segura-123")).toBeNull();
  });
});
