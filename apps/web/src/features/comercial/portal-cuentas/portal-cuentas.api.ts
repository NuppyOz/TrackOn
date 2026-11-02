import { api } from "../../../shared/api";
import type { CuentaPortal } from "./portal-cuentas.types";

export function obtenerCuentaPortal(clienteId: number) {
    return api<CuentaPortal | null>(`/api/comercial/clientes/${clienteId}/cuenta-portal`);
}
export function crearCuentaPortal(clienteId: number, identificador: string, password: string) {
    return api<CuentaPortal>(`/api/comercial/clientes/${clienteId}/cuenta-portal`, { method: "POST", body: JSON.stringify({ identificador, password }) });
}
export function cambiarEstadoCuentaPortal(cuenta: CuentaPortal, activo: boolean) {
    return api<CuentaPortal>(`/api/comercial/clientes/${cuenta.clienteId}/cuenta-portal`, { method: "PATCH", body: JSON.stringify({ version: cuenta.version, activo }) });
}
export function restablecerCuentaPortal(cuenta: CuentaPortal, password: string) {
    return api<CuentaPortal>(`/api/comercial/clientes/${cuenta.clienteId}/cuenta-portal/restablecer`, { method: "POST", body: JSON.stringify({ version: cuenta.version, password }) });
}
