import type { CotizacionDetalle, PaginaCotizaciones, PortalSesion } from "./portal.types";

export class PortalHttpError extends Error {
    readonly status: number;
    constructor(message: string, status: number) { super(message); this.status = status; this.name = "PortalHttpError"; }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`/api/portal${path}`, {
            ...init,
            credentials: "include",
            headers: { "Content-Type": "application/json", ...init.headers },
            signal: init.signal ?? AbortSignal.timeout(8000),
        });
    } catch {
        throw new PortalHttpError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.", 0);
    }
    if (!response.ok) {
        let message = "No se pudo completar la solicitud.";
        try {
            const body = await response.json() as { error?: { message?: string } };
            if (body.error?.message) message = body.error.message;
        } catch { /* respuesta sin JSON */ }
        throw new PortalHttpError(message, response.status);
    }
    if (response.status === 204) return undefined as T;
    const body = await response.json() as { data: T };
    return body.data;
}
export const portalApi = {
    login: (identificador: string, password: string) => request<PortalSesion>("/login", { method: "POST", body: JSON.stringify({ identificador, password }) }),
    me: () => request<PortalSesion>("/me"),
    logout: () => request<void>("/logout", { method: "POST" }),
    cotizaciones: (pagina = 1, estado?: string) => {
        const q = new URLSearchParams({ pagina: String(pagina), limite: "25" });
        if (estado) q.set("estado", estado);
        return request<PaginaCotizaciones>(`/cotizaciones?${q}`);
    },
    detalle: (id: number) => request<CotizacionDetalle>(`/cotizaciones/${id}`),
    decidir: (id: number, payload: { version: number; decision: "APROBADA" | "RECHAZADA"; comentario?: string }, key: string) => request<CotizacionDetalle>(`/cotizaciones/${id}/decision`, {
        method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(payload),
    }),
};
