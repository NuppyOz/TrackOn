import { api } from "../../shared/api";
import type { Cliente, ClienteNuevo, PaginaUbicaciones, UbicacionCliente, UbicacionNueva } from "./clientes.types";

export function listarClientes() {
    return api<Cliente[]>("/api/clientes");
}

export function crearCliente(datos: ClienteNuevo) {
    return api<Cliente>("/api/clientes", { method: "POST", body: JSON.stringify(datos) });
}

export function cambiarEstadoCliente(id: number, activo: boolean) {
    return api<Cliente>(`/api/clientes/${id}/estado`, {
        method: "PATCH", body: JSON.stringify({ activo }),
    });
}

export function listarUbicacionesCliente(clienteId: number, pagina = 1) {
    const query = new URLSearchParams({
        clienteId: String(clienteId), estado: "todos", pagina: String(pagina), limite: "25",
    });
    return api<PaginaUbicaciones>(`/api/ubicaciones?${query}`);
}

export function crearUbicacion(datos: UbicacionNueva) {
    return api<UbicacionCliente>("/api/ubicaciones", {
        method: "POST", body: JSON.stringify(datos),
    });
}

export function cambiarEstadoUbicacion(id: number, activa: boolean) {
    return api<UbicacionCliente>(`/api/ubicaciones/${id}/estado`, {
        method: "PATCH", body: JSON.stringify({ activa }),
    });
}
