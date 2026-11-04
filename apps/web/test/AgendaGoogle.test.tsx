import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Agenda from "../src/features/agenda/Agenda";

type Evento = { type: string; data?: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
    listarOrdenes: vi.fn(),
    estadoGoogleCalendar: vi.fn(),
    conectarGoogleCalendar: vi.fn(),
    desconectarGoogleCalendar: vi.fn(),
    sincronizarGoogleCalendar: vi.fn(),
    desconectar: vi.fn(),
    manejador: { actual: null as ((evento: Evento) => void) | null },
}));

vi.mock("../src/features/ordenes/ordenes.api", () => ({ listarOrdenes: mocks.listarOrdenes }));
vi.mock("../src/features/agenda/google-calendar.api", () => ({
    estadoGoogleCalendar: mocks.estadoGoogleCalendar,
    conectarGoogleCalendar: mocks.conectarGoogleCalendar,
    desconectarGoogleCalendar: mocks.desconectarGoogleCalendar,
    sincronizarGoogleCalendar: mocks.sincronizarGoogleCalendar,
}));
vi.mock("../src/shared/realtime", () => ({
    connectRealtime: (manejador: (evento: Evento) => void) => {
        mocks.manejador.actual = manejador;
        return mocks.desconectar;
    },
}));

const ubicacionOriginal = window.location;
const asignar = vi.fn();

function fijarUrl(search: string) {
    Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: { search, pathname: "/agenda", href: `http://localhost/agenda${search}`, protocol: "http:", host: "localhost", assign: asignar },
    });
}

function emitir(evento: Evento) {
    act(() => {
        mocks.manejador.actual?.(evento);
    });
}

const conectado = { configurado: true, conectado: true, calendarId: "cal-1", actualizadoEn: null };
const desconectado = { configurado: true, conectado: false, calendarId: null, actualizadoEn: null };

beforeEach(() => {
    vi.resetAllMocks();
    mocks.manejador.actual = null;
    fijarUrl("");
    mocks.listarOrdenes.mockResolvedValue({ items: [], hayMas: false });
    mocks.estadoGoogleCalendar.mockResolvedValue(desconectado);
});

afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: ubicacionOriginal });
});

describe("Agenda · integración con Google Calendar", () => {
    it("anuncia la conexión recién hecha y limpia la consulta de la URL", async () => {
        fijarUrl("?google=connected");
        const replaceState = vi.spyOn(window.history, "replaceState");

        render(<Agenda onOrden={vi.fn()} />);

        expect(await screen.findByText("Tu cuenta de Google Calendar quedó conectada.")).toBeTruthy();
        expect(replaceState).toHaveBeenCalledWith({}, "", "/agenda");
        replaceState.mockRestore();
    });

    it("muestra el motivo del error que llega por la URL", async () => {
        fijarUrl("?google=error&message=Permiso%20denegado");

        render(<Agenda onOrden={vi.fn()} />);

        expect(await screen.findByText("Permiso denegado")).toBeTruthy();
    });

    it("usa un mensaje por defecto cuando la URL no trae motivo", async () => {
        fijarUrl("?google=error");

        render(<Agenda onOrden={vi.fn()} />);

        expect(await screen.findByText("No se pudo conectar Google Calendar.")).toBeTruthy();
    });

    it("redirige a Google cuando la integración está configurada", async () => {
        mocks.conectarGoogleCalendar.mockResolvedValue({ url: "https://accounts.google.com/o/oauth2/auth?x=1" });

        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Conectar Google Calendar" }));

        await waitFor(() => expect(asignar).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/auth?x=1"));
        expect(mocks.conectarGoogleCalendar).toHaveBeenCalledTimes(1);
    });

    it("informa el fallo de conexión con el mensaje del servidor y con el genérico", async () => {
        mocks.conectarGoogleCalendar.mockRejectedValueOnce(new Error("Credenciales incompletas"));
        const primero = render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Conectar Google Calendar" }));
        expect(await screen.findByText("Credenciales incompletas")).toBeTruthy();
        primero.unmount();

        mocks.conectarGoogleCalendar.mockRejectedValueOnce("sin detalle");
        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Conectar Google Calendar" }));
        expect(await screen.findByText("No se pudo iniciar la conexión con Google.")).toBeTruthy();
    });

    it("deshabilita la conexión cuando faltan las credenciales OAuth", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue({ configurado: false, conectado: false, calendarId: null, actualizadoEn: null });

        render(<Agenda onOrden={vi.fn()} />);
        const boton = await screen.findByRole("button", { name: "Conectar Google Calendar" });

        await waitFor(() => expect(boton).toHaveProperty("disabled", true));
        expect(screen.getByText(/requiere configurar las credenciales OAuth/)).toBeTruthy();
    });

    it("sincroniza el día y refleja los eventos en tiempo real", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue(conectado);
        mocks.sincronizarGoogleCalendar.mockResolvedValue({ jobId: "job-1", estado: "EN_COLA" });

        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Sincronizar este día" }));

        expect(await screen.findByText("Sincronización en segundo plano iniciada…")).toBeTruthy();
        await waitFor(() => expect(mocks.sincronizarGoogleCalendar).toHaveBeenCalledTimes(1));
        expect(mocks.sincronizarGoogleCalendar.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        emitir({ type: "calendar.sync.completed", data: { sincronizadas: 1 } });
        expect(await screen.findByText("Sincronización terminada: 1 cita.")).toBeTruthy();

        emitir({ type: "calendar.sync.completed", data: { sincronizadas: 4 } });
        expect(await screen.findByText("Sincronización terminada: 4 citas.")).toBeTruthy();

        emitir({ type: "calendar.sync.completed" });
        expect(await screen.findByText("Sincronización terminada: 0 citas.")).toBeTruthy();

        emitir({ type: "calendar.sync.failed", data: { message: "Google respondió 500" } });
        expect(await screen.findByText("Google respondió 500")).toBeTruthy();

        emitir({ type: "calendar.sync.failed" });
        expect(await screen.findByText("La sincronización con Google falló.")).toBeTruthy();

        emitir({ type: "ordenes.updated" });
        expect(screen.queryByText(/Sincronización en segundo plano/)).toBeNull();
    });

    it("informa el fallo al iniciar la sincronización", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue(conectado);
        mocks.sincronizarGoogleCalendar.mockRejectedValueOnce(new Error("Cola saturada"));
        const primero = render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Sincronizar este día" }));
        expect(await screen.findByText("Cola saturada")).toBeTruthy();
        primero.unmount();

        mocks.sincronizarGoogleCalendar.mockRejectedValueOnce(42);
        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Sincronizar este día" }));
        expect(await screen.findByText("No se pudo iniciar la sincronización.")).toBeTruthy();
    });

    it("desconecta la cuenta después de confirmar", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue(conectado);
        mocks.desconectarGoogleCalendar.mockResolvedValue({ desconectado: true });

        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Desconectar" }));
        expect(screen.getByRole("dialog")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Sí, desconectar" }));

        expect(await screen.findByText("Cuenta de Google Calendar desconectada.")).toBeTruthy();
        await waitFor(() => expect(mocks.desconectarGoogleCalendar).toHaveBeenCalledTimes(1));
        expect(screen.getByRole("button", { name: "Conectar Google Calendar" })).toBeTruthy();
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("no desconecta si se cancela la confirmación", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue(conectado);

        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Desconectar" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

        expect(mocks.desconectarGoogleCalendar).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Desconectar" })).toBeTruthy();
    });

    it("informa el fallo al desconectar y cierra el diálogo", async () => {
        mocks.estadoGoogleCalendar.mockResolvedValue(conectado);
        mocks.desconectarGoogleCalendar.mockRejectedValueOnce(new Error("Token vencido"));

        render(<Agenda onOrden={vi.fn()} />);
        fireEvent.click(await screen.findByRole("button", { name: "Desconectar" }));
        fireEvent.click(screen.getByRole("button", { name: "Sí, desconectar" }));

        expect(await screen.findByText("Token vencido")).toBeTruthy();
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(screen.getByRole("button", { name: "Desconectar" })).toBeTruthy();
    });

    it("sigue funcionando si no se puede consultar el estado de Google", async () => {
        mocks.estadoGoogleCalendar.mockRejectedValueOnce(new Error("sin red"));

        render(<Agenda onOrden={vi.fn()} />);

        expect(await screen.findByRole("button", { name: "Conectar Google Calendar" })).toBeTruthy();
    });

    it("ignora un día vacío y muestra visitas sin fecha ni cuadrilla", async () => {
        mocks.listarOrdenes.mockResolvedValue({
            items: [
                {
                    id: 7, numero: "007", ubicacionId: 1, estadoCodigo: "PENDIENTE", solicitud: "Revisión",
                    prioridad: "ALTA", fechaProgramada: null, creadaEn: "", actualizadaEn: "", cerradaEn: null,
                    version: 1, clienteNombreRegistrado: "Cliente Siete", ubicacionNombreRegistrado: "Bodega",
                    direccionRegistrada: "Managua", asignaciones: [],
                },
                {
                    id: 8, numero: "008", ubicacionId: 1, estadoCodigo: "EN_EJECUCION", solicitud: "Instalación",
                    prioridad: "MEDIA", fechaProgramada: "2026-10-14T14:30:00-06:00", creadaEn: "", actualizadaEn: "",
                    cerradaEn: null, version: 1, clienteNombreRegistrado: "Cliente Ocho", ubicacionNombreRegistrado: "Sucursal",
                    direccionRegistrada: "León", asignaciones: [{ id: 2, inicio: "", motivo: "", cuadrilla: { id: 5, nombre: "Equipo B" }, empleadoResponsable: null }],
                },
            ],
            hayMas: true,
        });

        render(<Agenda onOrden={vi.fn()} />);
        expect(await screen.findByText(/OT-007/)).toBeTruthy();
        expect(screen.getByText(/Sin cuadrilla asignada/)).toBeTruthy();
        expect(screen.getByText(/Equipo B/)).toBeTruthy();

        const consultas = mocks.listarOrdenes.mock.calls.length;
        fireEvent.change(screen.getByLabelText("Día de atención"), { target: { value: "" } });
        expect(mocks.listarOrdenes.mock.calls.length).toBe(consultas);

        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 })));
    });
});
