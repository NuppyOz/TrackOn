import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sesion = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("../src/shared/api", () => ({ getAccessToken: () => sesion.token }));

const { connectRealtime } = await import("../src/shared/realtime");

class SocketFalso {
    static instancias: SocketFalso[] = [];
    url: string;
    protocolos?: string[];
    onmessage: ((mensaje: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;
    cerrado = false;
    constructor(url: string, protocolos?: string[]) {
        this.url = url;
        this.protocolos = protocolos;
        SocketFalso.instancias.push(this);
    }
    close() { this.cerrado = true; }
}

const ubicacionOriginal = window.location;

beforeEach(() => {
    SocketFalso.instancias = [];
    sesion.token = null;
    vi.stubGlobal("WebSocket", SocketFalso as unknown as typeof WebSocket);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Object.defineProperty(window, "location", { configurable: true, writable: true, value: ubicacionOriginal });
});

describe("Canal en tiempo real", () => {
    it("no abre conexión si no hay sesión iniciada", () => {
        const desconectar = connectRealtime(vi.fn());

        expect(SocketFalso.instancias).toHaveLength(0);
        expect(() => desconectar()).not.toThrow();
    });

    it("abre el socket con el token de la sesión en los protocolos", () => {
        sesion.token = "token-123";

        connectRealtime(vi.fn());

        expect(SocketFalso.instancias).toHaveLength(1);
        expect(SocketFalso.instancias[0].url).toMatch(/^ws:\/\/localhost(:\d+)?\/api\/realtime$/);
        expect(SocketFalso.instancias[0].protocolos).toEqual(["trackon", "token-123"]);
    });

    it("usa wss cuando la página se sirve por https", () => {
        sesion.token = "token-123";
        Object.defineProperty(window, "location", {
            configurable: true,
            writable: true,
            value: { protocol: "https:", host: "trackon.test" },
        });

        connectRealtime(vi.fn());

        expect(SocketFalso.instancias[0].url).toBe("wss://trackon.test/api/realtime");
    });

    it("entrega los eventos válidos e ignora los mensajes mal formados", () => {
        sesion.token = "token-123";
        const alEvento = vi.fn();
        connectRealtime(alEvento);
        const socket = SocketFalso.instancias[0];

        socket.onmessage?.({ data: JSON.stringify({ type: "calendar.sync.completed", data: { sincronizadas: 2 } }) });
        expect(alEvento).toHaveBeenCalledWith({ type: "calendar.sync.completed", data: { sincronizadas: 2 } });

        socket.onmessage?.({ data: "no es json" });
        expect(alEvento).toHaveBeenCalledTimes(1);
    });

    it("reintenta la conexión cuando el socket se cierra sin desmontar", () => {
        vi.useFakeTimers();
        sesion.token = "token-123";
        connectRealtime(vi.fn());

        SocketFalso.instancias[0].onclose?.();
        vi.advanceTimersByTime(2000);

        expect(SocketFalso.instancias).toHaveLength(2);
    });

    it("cierra la conexión y cancela el reintento al desmontar", () => {
        vi.useFakeTimers();
        sesion.token = "token-123";
        const desconectar = connectRealtime(vi.fn());
        const socket = SocketFalso.instancias[0];

        desconectar();
        socket.onclose?.();
        vi.advanceTimersByTime(5000);

        expect(socket.cerrado).toBe(true);
        expect(SocketFalso.instancias).toHaveLength(1);
    });
});
