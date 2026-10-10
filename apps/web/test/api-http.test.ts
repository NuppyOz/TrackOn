import { afterEach, describe, expect, it, vi } from "vitest";

function respuesta(data: unknown, status = 200): Response {
    return new Response(JSON.stringify({ data }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function errorHTTP(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: { message } }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function pendiente() {
    let resolver!: (response: Response) => void;
    const promesa = new Promise<Response>(resolve => { resolver = resolve; });
    return { promesa, resolver };
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
});

describe("Cliente HTTP compartido", () => {
    it("envía solicitudes GET con credenciales y devuelve data", async () => {
        const client = await import("../src/shared/api");
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(respuesta({ total: 4 }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await client.api<{ total: number }>("/api/servicios")).toEqual({ total: 4 });
        expect(fetchMock.mock.calls[0][0]).toBe("/api/servicios");
        expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
            credentials: "include", headers: { "Content-Type": "application/json" },
        }));
    });

    it("incluye el Bearer actual y conserva método, body y headers", async () => {
        const client = await import("../src/shared/api");
        client.setAccessToken("token-prueba");
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(respuesta({ creado: true }));
        vi.stubGlobal("fetch", fetchMock);
        const signal = new AbortController().signal;
        await client.api("/api/servicios", {
            method: "POST",
            body: JSON.stringify({ codigo: "A" }),
            headers: { "X-Trace": "prueba" },
            signal,
        });
        const options = fetchMock.mock.calls[0][1] as RequestInit;
        expect(options.method).toBe("POST");
        expect(options.body).toBe('{"codigo":"A"}');
        expect(options.signal).toBe(signal);
        expect(options.headers).toEqual(expect.objectContaining({
            Authorization: "Bearer token-prueba", "X-Trace": "prueba",
        }));
    });

    it("propaga el status y mensaje de error de la API", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => errorHTTP("Código duplicado", 409)));
        await expect(client.api("/api/servicios")).rejects.toMatchObject({
            name: "ApiError", status: 409, message: "Código duplicado",
        });
    });

    it("une los errores de validación de detalles", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            error: { message: "Validación fallida", details: [
                { message: "Código obligatorio" }, { message: "Nombre inválido" },
                null,
            ] },
        }), { status: 400 })));
        await expect(client.api("/api/servicios")).rejects.toThrow(
            "Código obligatorio Nombre inválido",
        );
    });

    it("usa el error principal cuando details está vacío", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            error: { message: "Error del servidor", details: [] },
        }), { status: 422 })));
        await expect(client.api("/api/servicios")).rejects.toThrow("Error del servidor");
    });

    it("usa un mensaje seguro cuando el error no es JSON", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => new Response("malformado", { status: 502 })));
        await expect(client.api("/api/servicios")).rejects.toThrow(
            "No se pudo completar la operación.",
        );
    });

    it("usa el mensaje seguro cuando falta error.message", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => respuesta({ descripcion: "sin error" }, 400)));
        await expect(client.api("/api/servicios")).rejects.toThrow(
            "No se pudo completar la operación.",
        );
    });

    it("no intenta refresh ante 401 de una ruta de autenticación", async () => {
        const client = await import("../src/shared/api");
        const fetchMock = vi.fn(async () => errorHTTP("No autorizado", 401));
        vi.stubGlobal("fetch", fetchMock);
        await expect(client.api("/api/auth/login")).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("renueva credenciales en 401 y repite la solicitud protegida", async () => {
        const client = await import("../src/shared/api");
        client.setAccessToken("anterior");
        const fetchMock = vi.fn()
            .mockImplementationOnce(async () => respuesta(null, 401))
            .mockImplementationOnce(async () => respuesta({ accessToken: "nuevo" }))
            .mockImplementationOnce(async () => respuesta({ items: [1, 2] }));
        vi.stubGlobal("fetch", fetchMock);

        expect(await client.api("/api/equipos")).toEqual({ items: [1, 2] });
        expect(fetchMock.mock.calls.map(c => c[0])).toEqual([
            "/api/equipos", "/api/auth/refresh", "/api/equipos",
        ]);
        expect((fetchMock.mock.calls[2][1].headers as Record<string, string>).Authorization)
            .toBe("Bearer nuevo");
    });

    it("expira la sesión cuando refresh responde 401", async () => {
        const client = await import("../src/shared/api");
        client.setAccessToken("antiguo");
        const eventos: string[] = [];
        const listener = () => eventos.push("expirada");
        window.addEventListener("trackon:session-expired", listener);
        try {
            const fetchMock = vi.fn()
                .mockImplementationOnce(async () => respuesta(null, 401))
                .mockImplementationOnce(async () => respuesta(null, 401));
            vi.stubGlobal("fetch", fetchMock);
            await expect(client.api("/api/equipos")).rejects.toMatchObject({ status: 401 });
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(eventos).toContain("expirada");
        } finally {
            window.removeEventListener("trackon:session-expired", listener);
        }
    });

    it("rechaza la petición antigua si se cambia de sesión mientras responde", async () => {
        const client = await import("../src/shared/api");
        client.setAccessToken("vieja");
        const solicitud = pendiente();
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(solicitud.promesa));
        const operacion = client.api("/api/equipos");
        client.setAccessToken("nueva");
        solicitud.resolver(respuesta({ items: [] }));
        await expect(operacion).rejects.toThrow("La sesión cambió");
    });

    it("rechaza una respuesta cuya lectura finaliza después del logout", async () => {
        const client = await import("../src/shared/api");
        client.setAccessToken("antigua");
        let resolver!: (value: { data: unknown }) => void;
        const lectura = new Promise<{ data: unknown }>(resolve => { resolver = resolve; });
        const response = respuesta({ items: [] });
        const jsonSpy = vi.spyOn(response, "json").mockImplementation(() => lectura);
        vi.stubGlobal("fetch", vi.fn(async () => response));
        const operacion = client.api("/api/equipos");
        await vi.waitFor(() => expect(jsonSpy).toHaveBeenCalledTimes(1));
        client.comenzarLogout();
        resolver({ data: { items: [] } });
        await expect(operacion).rejects.toThrow("La sesión cambió");
    });

    it("devuelve null al renovar si refresh no contiene accessToken", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => respuesta({}))); 
        expect(await client.renovarAccessToken()).toBeNull();
    });

    it("devuelve null al renovar ante un error de red", async () => {
        const client = await import("../src/shared/api");
        vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Sin conexión"); }));
        expect(await client.renovarAccessToken()).toBeNull();
    });
});
