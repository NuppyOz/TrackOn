export class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}

let accessToken: string | null = null;
let generacionSesion = 0;
let versionCredenciales = 0;
let logoutEnCurso = false;
let refreshEnCurso: { generacion: number; promesa: Promise<string | null> } | null = null;

export function getVersionSesion(): number {
    return generacionSesion;
}

// Uso externo: login completado o invalidación explícita de sesión.
export function setAccessToken(token: string | null): void {
    generacionSesion++;
    versionCredenciales++;
    accessToken = token;
    if (token !== null) logoutEnCurso = false;
}

// Bloquea renovaciones durante el cierre (aunque el backend tarde en responder).
export function comenzarLogout(): void {
    generacionSesion++;
    versionCredenciales++;
    accessToken = null;
    logoutEnCurso = true;
}

function actualizarCredenciales(token: string): void {
    accessToken = token;
    versionCredenciales++;
}

function sesionCambio(): ApiError {
    return new ApiError("La sesión cambió durante la solicitud.", 401);
}

function expirarSesion(generacion: number): void {
    if (generacion !== generacionSesion || logoutEnCurso) return;
    setAccessToken(null);
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("trackon:session-expired"));
    }
}

export async function renovarAccessToken(): Promise<string | null> {
    if (logoutEnCurso) return null;
    if (refreshEnCurso?.generacion === generacionSesion) {
        return refreshEnCurso.promesa;
    }

    const generacionInicial = generacionSesion;
    const credencialesIniciales = versionCredenciales;
    const operacion = (async (): Promise<string | null> => {
        try {
            const response = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
                signal: AbortSignal.timeout(8000),
            });
            if (generacionSesion !== generacionInicial || logoutEnCurso) return null;
            if (!response.ok) {
                if (versionCredenciales === credencialesIniciales) {
                    expirarSesion(generacionInicial);
                }
                return null;
            }
            const body = (await response.json()) as { data?: { accessToken?: string } };
            if (generacionSesion !== generacionInicial || logoutEnCurso) return null;
            if (versionCredenciales !== credencialesIniciales) return accessToken;
            const token = body.data?.accessToken;
            if (!token) {
                expirarSesion(generacionInicial);
                return null;
            }
            actualizarCredenciales(token);
            return token;
        } catch {
            if (generacionSesion === generacionInicial &&
                versionCredenciales === credencialesIniciales && !logoutEnCurso) {
                expirarSesion(generacionInicial);
            }
            return null;
        }
    })();

    const registro = { generacion: generacionInicial, promesa: operacion };
    refreshEnCurso = registro;
    try {
        return await operacion;
    } finally {
        if (refreshEnCurso === registro) refreshEnCurso = null;
    }
}

async function mensajeError(response: Response): Promise<string> {
    try {
        const body: unknown = await response.json();
        if (typeof body === "object" && body !== null && "error" in body) {
            const error = body.error;
            if (typeof error === "object" && error !== null &&
                "message" in error && typeof error.message === "string") {
                if ("details" in error && Array.isArray(error.details)) {
                    const detalles = error.details
                        .map(item => typeof item === "object" && item !== null &&
                            "message" in item ? item.message : null)
                        .filter((item): item is string => typeof item === "string");
                    return detalles.length ? detalles.join(" ") : error.message;
                }
                return error.message;
            }
        }
    } catch {
        /* La respuesta puede no incluir JSON */
    }
    return "No se pudo completar la operación.";
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const esAuth = url.startsWith("/api/auth/");
    const generacionInicial = generacionSesion;
    let versionEnvio = versionCredenciales;
    let tokenEnvio = accessToken;
    const enviar = (token: string | null) => fetch(url, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
        signal: init?.signal ?? AbortSignal.timeout(8000),
    });
    let response = await enviar(tokenEnvio);
    if (!esAuth && generacionSesion !== generacionInicial) throw sesionCambio();

    if (response.status === 401 && !esAuth) {
        // Un refresh anterior ya pudo haber cambiado el token: no renovar otra vez.
        let token = versionCredenciales !== versionEnvio ? accessToken : null;
        if (!token) token = await renovarAccessToken();
        if (generacionSesion !== generacionInicial) throw sesionCambio();
        if (!token) {
            expirarSesion(generacionInicial);
            throw new ApiError("La sesión ha expirado.", 401);
        }
        versionEnvio = versionCredenciales;
        tokenEnvio = token;
        response = await enviar(tokenEnvio);
        if (generacionSesion !== generacionInicial) throw sesionCambio();
        if (response.status === 401) {
            // Solo caduca la sesión si sigue siendo el token que acabamos de probar.
            if (versionEnvio === versionCredenciales) expirarSesion(generacionInicial);
        }
    }

    if (generacionSesion !== generacionInicial && !esAuth) throw sesionCambio();
    if (!response.ok) {
        const message = await mensajeError(response);
        if (generacionSesion !== generacionInicial && !esAuth) throw sesionCambio();
        throw new ApiError(message, response.status);
    }
    const body = (await response.json()) as { data: T };
    if (generacionSesion !== generacionInicial && !esAuth) throw sesionCambio();
    return body.data;
}
