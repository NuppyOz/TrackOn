import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotificationsBell from "../src/features/notificaciones/NotificationsBell";
import { ApiError } from "../src/shared/api";

type Evento = { type: string; data?: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
    contar: vi.fn(),
    listar: vi.fn(),
    leer: vi.fn(),
    todas: vi.fn(),
    navegar: vi.fn(),
    manejador: { actual: null as ((evento: Evento) => void) | null },
}));

vi.mock("../src/features/notificaciones/notificaciones.api", () => ({
    contarNoLeidas: mocks.contar,
    listarNotificaciones: mocks.listar,
    marcarNotificacionLeida: mocks.leer,
    marcarTodasNotificacionesLeidas: mocks.todas,
}));
vi.mock("../src/shared/navigation", () => ({ irA: mocks.navegar }));
vi.mock("../src/shared/realtime", () => ({
    connectRealtime: (manejador: (evento: Evento) => void) => {
        mocks.manejador.actual = manejador;
        return vi.fn();
    },
}));

const aviso = (id: number, extra: Partial<{ ordenId: number | null; leidaEn: string | null; creadaEn: string; tipo: string; mensaje: string }> = {}) => ({
    id,
    ordenId: extra.ordenId === undefined ? null : extra.ordenId,
    tipo: extra.tipo ?? "ORDEN_ASIGNADA",
    mensaje: extra.mensaje ?? `Aviso ${id}`,
    creadaEn: extra.creadaEn ?? new Date().toISOString(),
    leidaEn: extra.leidaEn === undefined ? null : extra.leidaEn,
});

beforeEach(() => {
    vi.resetAllMocks();
    mocks.manejador.actual = null;
    mocks.contar.mockResolvedValue({ noLeidas: 2 });
    mocks.listar.mockResolvedValue({ noLeidas: 2, nextCursor: null, items: [aviso(1), aviso(2, { leidaEn: new Date().toISOString() })] });
    mocks.todas.mockResolvedValue({ actualizadas: 2, leidaEn: "2026-11-04T12:00:00.000Z" });
});

afterEach(() => {
    cleanup();
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
});

async function abrirBandeja() {
    fireEvent.click(await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ }));
    await screen.findByRole("region", { name: "Notificaciones" });
}

describe("Bandeja de notificaciones · operaciones de la API", () => {
    it("marca todas como leídas y limpia el contador", async () => {
        render(<NotificationsBell habilitada />);
        await abrirBandeja();

        fireEvent.click(screen.getByRole("button", { name: "Leer todas" }));

        await waitFor(() => expect(mocks.todas).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole("button", { name: "Notificaciones" })).toBeTruthy();
        expect(screen.getByText("0 sin leer")).toBeTruthy();
    });

    it("no repite el marcado masivo mientras está en curso", async () => {
        let resolver!: (valor: { actualizadas: number; leidaEn: string }) => void;
        mocks.todas.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
        render(<NotificationsBell habilitada />);
        await abrirBandeja();

        const boton = screen.getByRole("button", { name: "Leer todas" });
        fireEvent.click(boton);
        expect(screen.getByRole("button", { name: "Marcando…" })).toHaveProperty("disabled", true);
        fireEvent.click(screen.getByRole("button", { name: "Marcando…" }));
        expect(mocks.todas).toHaveBeenCalledTimes(1);

        await act(async () => { resolver({ actualizadas: 2, leidaEn: "2026-11-04T12:00:00.000Z" }); });
    });

    it("informa el fallo al marcar todas, con mensaje y sin él", async () => {
        mocks.todas.mockRejectedValueOnce(new Error("Servidor ocupado"));
        const primero = render(<NotificationsBell habilitada />);
        await abrirBandeja();
        fireEvent.click(screen.getByRole("button", { name: "Leer todas" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Servidor ocupado"));
        primero.unmount();

        mocks.todas.mockRejectedValueOnce("sin detalle");
        render(<NotificationsBell habilitada />);
        await abrirBandeja();
        fireEvent.click(screen.getByRole("button", { name: "Leer todas" }));
        expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("No se pudieron marcar todas como leídas."));
    });

    it("carga más avisos con el cursor de la página siguiente", async () => {
        mocks.listar.mockResolvedValueOnce({ noLeidas: 2, nextCursor: 30, items: [aviso(1)] });
        mocks.listar.mockResolvedValueOnce({ noLeidas: 2, nextCursor: null, items: [aviso(2)] });
        render(<NotificationsBell habilitada />);
        await abrirBandeja();

        fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));

        await waitFor(() => expect(mocks.listar).toHaveBeenLastCalledWith(30));
        expect(await screen.findByText("Aviso 2")).toBeTruthy();
        expect(screen.getByText("Aviso 1")).toBeTruthy();
    });

    it("muestra la carga y luego el estado vacío", async () => {
        let resolver!: (valor: { noLeidas: number; nextCursor: number | null; items: unknown[] }) => void;
        mocks.listar.mockReturnValue(new Promise(resolve => { resolver = resolve; }));
        render(<NotificationsBell habilitada />);
        fireEvent.click(await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ }));

        expect(await screen.findByText("Cargando notificaciones…")).toBeTruthy();
        await act(async () => { resolver({ noLeidas: 0, nextCursor: null, items: [] }); });

        expect(await screen.findByText("No tienes notificaciones.")).toBeTruthy();
    });

    it("muestra el error de la API y permite reintentar", async () => {
        mocks.listar.mockRejectedValueOnce(new ApiError("Sesión expirada", 401));
        render(<NotificationsBell habilitada />);
        await abrirBandeja();

        expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Sesión expirada"));
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

        expect(await screen.findByText("Aviso 1")).toBeTruthy();
    });

    it("usa un mensaje genérico cuando el error no viene de la API", async () => {
        mocks.listar.mockRejectedValueOnce(new Error("caída de red"));
        render(<NotificationsBell habilitada />);
        await abrirBandeja();

        expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("No se pudieron cargar las notificaciones."));
    });

    it("cierra el panel con el botón de cerrar y con el fondo", async () => {
        render(<NotificationsBell habilitada />);
        await abrirBandeja();
        fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
        expect(screen.queryByRole("region", { name: "Notificaciones" })).toBeNull();

        fireEvent.click(await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ }));
        await screen.findByRole("region", { name: "Notificaciones" });
        fireEvent.click(screen.getByRole("button", { name: "Cerrar notificaciones" }));
        expect(screen.queryByRole("region", { name: "Notificaciones" })).toBeNull();
    });

    it("no navega cuando el aviso no apunta a una orden", async () => {
        mocks.listar.mockResolvedValue({ noLeidas: 1, nextCursor: null, items: [aviso(5, { ordenId: null })] });
        render(<NotificationsBell habilitada />);
        fireEvent.click(await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ }));
        fireEvent.click(await screen.findByRole("button", { name: /Aviso 5/ }));

        await waitFor(() => expect(mocks.leer).toHaveBeenCalledWith(5));
        expect(mocks.navegar).not.toHaveBeenCalled();
        expect(screen.getByRole("region", { name: "Notificaciones" })).toBeTruthy();
    });

    it("resume el contador en 99+ y muestra las fechas relativas", async () => {
        const ahora = Date.now();
        mocks.contar.mockResolvedValue({ noLeidas: 150 });
        mocks.listar.mockResolvedValue({
            noLeidas: 150,
            nextCursor: null,
            items: [
                aviso(1, { creadaEn: new Date(ahora).toISOString() }),
                aviso(2, { creadaEn: new Date(ahora - 5 * 60000).toISOString() }),
                aviso(3, { creadaEn: new Date(ahora - 3 * 3600000).toISOString() }),
                aviso(4, { creadaEn: new Date(ahora - 5 * 86400000).toISOString() }),
            ],
        });

        render(<NotificationsBell habilitada />);
        expect(await screen.findByText("99+")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /Notificaciones, 150 sin leer/ }));

        expect(await screen.findByText("Ahora")).toBeTruthy();
        expect(screen.getByText("Hace 5 min")).toBeTruthy();
        expect(screen.getByText("Hace 3 h")).toBeTruthy();
    });

    it("reacciona a los cambios del canal en tiempo real", async () => {
        render(<NotificationsBell habilitada />);
        await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ });
        mocks.contar.mockResolvedValue({ noLeidas: 4 });

        act(() => {
            mocks.manejador.actual?.({ type: "data.changed" });
        });

        expect(await screen.findByRole("button", { name: /Notificaciones, 4 sin leer/ })).toBeTruthy();
    });

    it("no consulta el contador si la pestaña está oculta", async () => {
        render(<NotificationsBell habilitada />);
        await screen.findByRole("button", { name: /Notificaciones, 2 sin leer/ });
        const llamadas = mocks.contar.mock.calls.length;

        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        act(() => {
            mocks.manejador.actual?.({ type: "data.changed" });
            document.dispatchEvent(new Event("visibilitychange"));
        });

        expect(mocks.contar.mock.calls.length).toBe(llamadas);
    });

    it("avisa si no hay sesión para consultar la bandeja", async () => {
        render(<NotificationsBell habilitada={false} />);
        fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

        expect(await screen.findByText("Necesitas una sesión activa para consultar tus notificaciones.")).toBeTruthy();
        expect(screen.getByText("Bandeja personal")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Leer todas" })).toBeNull();
    });
});
