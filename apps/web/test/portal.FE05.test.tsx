import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PortalApp } from "../src/features/portal/PortalApp";

const session = { cuenta: { id: 9, identificador: "cliente.demo" }, cliente: { id: 3, nombre: "Taller Central" } };
const quote = {
  id: 18, version: 4, estadoPersistido: "ENVIADA", estadoEfectivo: "ENVIADA", moneda: "NIO", subtotal: "100.00", descuento: "0.00", total: "100.00",
  venceEn: "2026-11-01T00:00:00Z", enviadaEn: "2026-10-20T10:00:00Z", decididaEn: null, decisionComentario: null,
  accionesPermitidas: { decidir: true }, lineas: [{ id: 1, posicion: 1, descripcion: "Mantenimiento", unidad: "servicio", cantidad: "1.000", precio: "100.00", descuento: "0.00", subtotal: "100.00", total: "100.00" }],
};
const list = { items: [{ id: 18, version: 4, estadoPersistido: "ENVIADA", estadoEfectivo: "ENVIADA", moneda: "NIO", total: "100.00", venceEn: quote.venceEn, enviadaEn: quote.enviadaEn, decididaEn: null, accionesPermitidas: { decidir: true } }], pagina: 1, limite: 25, hayMas: false };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const ok = (data: unknown) => json({ data });

beforeEach(() => {
  let decisions = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/portal/me") return json({ error: { message: "Unauthorized" } }, 401);
    if (url === "/api/portal/login") return ok(session);
    if (url.startsWith("/api/portal/cotizaciones?") && init?.method !== "POST") return ok(list);
    if (url === "/api/portal/cotizaciones/18") return ok(quote);
    if (url === "/api/portal/cotizaciones/18/decision") {
      decisions += 1;
      if (decisions === 1) return json({ error: { message: "La versión cambió." } }, 409);
      return ok({ ...quote, version: 5, estadoPersistido: "APROBADA", estadoEfectivo: "APROBADA", accionesPermitidas: { decidir: false } });
    }
    throw new Error(`Unexpected request ${url}`);
  }));
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "decision-key-1") });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Portal FE05", () => {
  it("usa cookie aislada y mantiene la misma clave al reintentar una decisión con el mismo contenido", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    render(<PortalApp />);
    fireEvent.change(await screen.findByLabelText("Identificador"), { target: { value: "cliente.demo" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secret-pass-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await screen.findByText("Taller Central");
    fireEvent.click(await screen.findByRole("button", { name: "Ver cotización" }));
    await screen.findByRole("heading", { name: "Cotización #18" });
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    fireEvent.change(screen.getByLabelText("Comentario opcional"), { target: { value: "Conforme" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aprobación" }));
    expect((await screen.findByRole("alert")).textContent).toContain("La versión cambió.");
    expect(screen.getByLabelText("Comentario opcional")).toHaveProperty("value", "Conforme");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aprobación" }));
    await screen.findByText("APROBADA");
    const decisionCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/decision"));
    expect(decisionCalls).toHaveLength(2);
    expect(decisionCalls[0][1]).toMatchObject({ credentials: "include", headers: expect.objectContaining({ "Idempotency-Key": "decision-key-1" }) });
    expect((decisionCalls[0][1] as RequestInit).headers).not.toHaveProperty("Authorization");
    expect((decisionCalls[1][1] as RequestInit).headers).toMatchObject({ "Idempotency-Key": "decision-key-1" });
    expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit).credentials === "include")).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it("distingue una lista realmente vacía de la carga inicial", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/portal/me") return json({ error: { message: "Unauthorized" } }, 401);
      if (url === "/api/portal/login") return ok(session);
      if (url.startsWith("/api/portal/cotizaciones?") && init?.method !== "POST") return ok({ ...list, items: [] });
      throw new Error(`Unexpected request ${url}`);
    }));
    render(<PortalApp />);
    fireEvent.change(await screen.findByLabelText("Identificador"), { target: { value: "cliente.demo" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "secret-pass-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("No hay cotizaciones para mostrar.")).toBeTruthy();
  });

  it("muestra un error de sesión claro cuando /me expira", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { message: "Unauthorized" } }, 401)));
    render(<PortalApp />);
    expect(await screen.findByRole("heading", { name: "Mis cotizaciones" })).toBeTruthy();
    expect(screen.queryByText(/sesión expiró/i)).toBeNull();
  });
});
