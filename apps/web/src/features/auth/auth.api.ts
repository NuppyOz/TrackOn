import { api, ApiError, comenzarLogout, getVersionSesion, renovarAccessToken, setAccessToken } from "../../shared/api";

export type RolUsuario = "ADMIN" | "GTE_OPE" | "TEC";
export interface UsuarioSesion {
    id: number;
    identificador: string;
    rol: { cod: RolUsuario; nombre: string };
    empleado: { persona?: { firstName: string; firstLastName: string } };
}

export async function iniciarSesion(identificador: string, password: string): Promise<UsuarioSesion> {
    const versionInicial = getVersionSesion();
    const datos = await api<{ accessToken: string; usuario: UsuarioSesion }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identificador: identificador.trim().toLowerCase(), password }),
    });
    if (getVersionSesion() !== versionInicial) {
        throw new ApiError("La sesión cambió durante el inicio de sesión.", 401);
    }
    setAccessToken(datos.accessToken);
    return datos.usuario;
}

export async function renovarSesion(): Promise<UsuarioSesion | null> {
    const token = await renovarAccessToken();
    if (!token) return null;
    const versionRecuperada = getVersionSesion();
    try {
        const datos = await api<{ usuario: UsuarioSesion }>("/api/auth/me");
        if (getVersionSesion() !== versionRecuperada) return null;
        return datos.usuario;
    } catch {
        if (getVersionSesion() === versionRecuperada) setAccessToken(null);
        return null;
    }
}

export async function cerrarSesion(): Promise<void> {
    comenzarLogout();
    // Revocación y eliminación de cookie dependen del backend.
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new ApiError("No se pudo revocar la sesión en el servidor.", response.status);
}

export function puedeAdministrarCatalogos(rol: RolUsuario): boolean {
    return rol === "ADMIN" || rol === "GTE_OPE";
}
