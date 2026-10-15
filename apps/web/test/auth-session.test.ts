import { afterEach, describe, expect, it, vi } from "vitest";

const respuesta = (data: unknown, status = 200): Response =>
    new Response(JSON.stringify({ data }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
const diferida = () => {
    let resolver!: (value: Response) => void;
    const promesa = new Promise<Response>(resolve => {
        resolver = resolve;
    });
    return { promesa, resolver };
};

// Un módulo nuevo por prueba: las variables de sesión viven a nivel de módulo.
describe("Autenticación concurrente", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it("descarta refresh pendiente tras logout", async () => {
        const api = await import("../src/shared/api");
        const pending = diferida();
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promesa));
        const renovacion = api.renovarAccessToken();
        api.comenzarLogout();
        pending.resolver(respuesta({ accessToken: "antiguo" }));
        expect(await renovacion).toBeNull();
        expect(await api.renovarAccessToken()).toBeNull();
    });

    it("descarta refresh previo a un nuevo login", async () => {
        const api = await import("../src/shared/api");
        const pending = diferida();
        const fetchMock = vi
            .fn()
            .mockReturnValueOnce(pending.promesa)
            .mockResolvedValueOnce(respuesta({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);
        const renovacion = api.renovarAccessToken();
        api.setAccessToken("nuevo");
        pending.resolver(respuesta({ accessToken: "antiguo" }));
        expect(await renovacion).toBeNull();
        await api.api("/api/equipos");
        const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer nuevo");
    });

    it("dos respuestas 401 comparten un único refresh", async () => {
        const api = await import("../src/shared/api");
        api.setAccessToken("viejo");
        const primera = diferida();
        const segunda = diferida();
        const refresh = diferida();
        const fetchMock = vi
            .fn()
            .mockReturnValueOnce(primera.promesa)
            .mockReturnValueOnce(segunda.promesa)
            .mockReturnValueOnce(refresh.promesa)
            .mockImplementation(() => Promise.resolve(respuesta({ ok: true })));
        vi.stubGlobal("fetch", fetchMock);
        const a = api.api<{ ok: boolean }>("/api/equipos");
        const b = api.api<{ ok: boolean }>("/api/servicios");
        primera.resolver(respuesta(null, 401));
        segunda.resolver(respuesta(null, 401));
        // Se necesita dar paso a las continuaciones de ambas respuestas.
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        refresh.resolver(respuesta({ accessToken: "renovado" }));
        expect((await a).ok).toBe(true);
        expect((await b).ok).toBe(true);
        expect(fetchMock.mock.calls.filter(c => c[0] === "/api/auth/refresh")).toHaveLength(1);
    });

    it("401 tardío aprovecha credenciales ya renovadas", async () => {
        const api = await import("../src/shared/api");
        api.setAccessToken("viejo");
        const tardia = diferida();
        const fetchMock = vi
            .fn()
            .mockReturnValueOnce(tardia.promesa)
            .mockResolvedValueOnce(respuesta(null, 401))
            .mockResolvedValueOnce(respuesta({ accessToken: "nuevo" }))
            .mockImplementation(() => Promise.resolve(respuesta({ ok: true })));
        vi.stubGlobal("fetch", fetchMock);
        const a = api.api("/api/equipos");
        const b = api.api("/api/servicios");
        await b;
        tardia.resolver(respuesta(null, 401));
        await a;
        expect(fetchMock.mock.calls.filter(c => c[0] === "/api/auth/refresh")).toHaveLength(1);
    });

    it("logout invalida credenciales antes de esperar al servidor", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        api.setAccessToken("anterior");
        const pending = diferida();
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending.promesa));
        const salida = auth.cerrarSesion();
        expect(await api.renovarAccessToken()).toBeNull();
        pending.resolver(respuesta({ ok: true }));
        await salida;
    });

    it("login actualiza el token y desbloquea renovaciones tras logout", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        const usuario = { id: 1, identificador: "admin", rol: { cod: "ADMIN", nombre: "Admin" }, empleado: {} };
        api.comenzarLogout();
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockResolvedValueOnce(respuesta({ accessToken: "nuevo", usuario }))
                .mockResolvedValueOnce(respuesta({ accessToken: "renovado" })),
        );
        expect(await auth.iniciarSesion("ADMIN", "clave")).toEqual(usuario);
        expect(await api.renovarAccessToken()).toBe("renovado");
    });
});
