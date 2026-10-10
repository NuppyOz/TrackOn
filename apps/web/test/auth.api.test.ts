import { afterEach, describe, expect, it, vi } from "vitest";
import type { UsuarioSesion } from "../src/features/auth/auth.api";

const usuario: UsuarioSesion = {
    id: 1,
    identificador: "administrador.trackon",
    rol: { cod: "ADMIN", nombre: "Administrador" },
    empleado: { persona: { firstName: "Usuario", firstLastName: "Prueba" } },
};

function respuesta(data: unknown, status = 200): Response {
    return new Response(JSON.stringify({ data }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function pendiente() {
    let resolver!: (response: Response) => void;
    const promesa = new Promise<Response>(resolve => {
        resolver = resolve;
    });
    return { promesa, resolver };
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
});

describe("API de autenticación", () => {
    it("normaliza el identificador y guarda las credenciales del login", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(async () => respuesta({ accessToken: "token-login", usuario }))
            .mockImplementationOnce(async () => respuesta({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await auth.iniciarSesion("  ADMINISTRADOR.TRACKON  ", "secreto")).toEqual(usuario);
        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("/api/auth/login");
        expect(options.method).toBe("POST");
        expect(JSON.parse(String(options.body))).toEqual({
            identificador: "administrador.trackon",
            password: "secreto",
        });

        await api.api("/api/equipos");
        const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer token-login");
    });

    it("propaga un login rechazado sin autenticar al usuario", async () => {
        const auth = await import("../src/features/auth/auth.api");
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(JSON.stringify({ error: { message: "Credenciales incorrectas" } }), {
                        status: 401,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );
        await expect(auth.iniciarSesion("usuario", "incorrecta")).rejects.toThrow("Credenciales incorrectas");
    });

    it("descarta un login que concluye después de un cambio de sesión", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        const solicitud = pendiente();
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(solicitud.promesa));
        const login = auth.iniciarSesion("admin", "clave");
        api.setAccessToken("otra-sesion");
        solicitud.resolver(respuesta({ accessToken: "obsoleto", usuario }));
        await expect(login).rejects.toThrow("La sesión cambió");
    });

    it("restaura una sesión válida mediante refresh y /me", async () => {
        const auth = await import("../src/features/auth/auth.api");
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(async () => respuesta({ accessToken: "renovado" }))
            .mockImplementationOnce(async () => respuesta({ usuario }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await auth.renovarSesion()).toEqual(usuario);
        expect(fetchMock.mock.calls.map(c => c[0])).toEqual(["/api/auth/refresh", "/api/auth/me"]);
        const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
        expect(headers.Authorization).toBe("Bearer renovado");
    });

    it("devuelve null cuando el servidor rechaza el refresh", async () => {
        const auth = await import("../src/features/auth/auth.api");
        const fetchMock = vi.fn(async () => respuesta(null, 401));
        vi.stubGlobal("fetch", fetchMock);
        expect(await auth.renovarSesion()).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("devuelve null si /me devuelve un error y limpia el token", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(async () => respuesta({ accessToken: "temporal" }))
            .mockImplementationOnce(async () => respuesta(null, 403))
            .mockImplementationOnce(async () => respuesta({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await auth.renovarSesion()).toBeNull();
        await api.api("/api/auth/login");
        const headers = fetchMock.mock.calls[2][1].headers as Record<string, string>;
        expect(headers.Authorization).toBeUndefined();
    });

    it("no restaura una sesión antigua si cambia durante /me", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        const solicitud = pendiente();
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(async () => respuesta({ accessToken: "viejo" }))
            .mockImplementationOnce(() => solicitud.promesa);
        vi.stubGlobal("fetch", fetchMock);

        const restauracion = auth.renovarSesion();
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        api.setAccessToken("nuevo-login");
        solicitud.resolver(respuesta({ usuario }));
        expect(await restauracion).toBeNull();
    });

    it("concluye el logout y bloquea renovaciones locales", async () => {
        const api = await import("../src/shared/api");
        const auth = await import("../src/features/auth/auth.api");
        api.setAccessToken("token-previo");
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(respuesta({ ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        await auth.cerrarSesion();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/logout");
        expect(fetchMock.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                method: "POST",
                credentials: "include",
            }),
        );
        expect(await api.renovarAccessToken()).toBeNull();
    });

    it("informa cuando el backend no puede revocar la sesión", async () => {
        const auth = await import("../src/features/auth/auth.api");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => respuesta(null, 500)),
        );
        await expect(auth.cerrarSesion()).rejects.toMatchObject({
            name: "ApiError",
            status: 500,
        });
    });

    it("propaga los errores de red del logout", async () => {
        const auth = await import("../src/features/auth/auth.api");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("Sin red");
            }),
        );
        await expect(auth.cerrarSesion()).rejects.toThrow("Sin red");
    });

    it("autoriza a ADMIN y GTE_OPE, pero no a TEC", async () => {
        const { puedeAdministrarCatalogos } = await import("../src/features/auth/auth.api");
        expect(puedeAdministrarCatalogos("ADMIN")).toBe(true);
        expect(puedeAdministrarCatalogos("GTE_OPE")).toBe(true);
        expect(puedeAdministrarCatalogos("TEC")).toBe(false);
    });
});
