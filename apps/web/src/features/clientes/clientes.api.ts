import { api } from "../../shared/api";
import type { Pagina } from "../../shared/pagination";
import type { Cliente, ClienteNuevo, PaginaUbicaciones, UbicacionCliente, UbicacionNueva } from "./clientes.types";

/** Lista completa para selectores; el listado paginado usa `listarClientesPagina`. */
export function listarClientes() {
    return api<Cliente[]>("/api/clientes");
}

export type FiltrosClientes = Readonly<{ buscar: string; tipo: string; estado: string; pagina: number; limite: number }>;
export function listarClientesPagina(filtros: FiltrosClientes) {
    const query = new URLSearchParams({ pagina: String(filtros.pagina), limite: String(filtros.limite), estado: filtros.estado });
    if (filtros.buscar.trim()) query.set("buscar", filtros.buscar.trim());
    if (filtros.tipo) query.set("tipo", filtros.tipo);
    return api<Pagina<Cliente>>(`/api/clientes?${query}`);
}

export function obtenerCliente(id: number) {
    return api<Cliente>(`/api/clientes/${id}`);
}

export function crearCliente(datos: ClienteNuevo) {
    return api<Cliente>("/api/clientes", { method: "POST", body: JSON.stringify(datos) });
}

export type ClienteActualizacion = Readonly<{
    telefonoComercial?: string | null;
    correoComercial?: string | null;
    persona?: Partial<NonNullable<Cliente['persona']>>;
    organizacion?: Partial<NonNullable<Cliente['organizacion']>>;
}>;
export function actualizarCliente(id: number, datos: ClienteActualizacion) {
    return api<Cliente>(`/api/clientes/${id}`, { method: "PATCH", body: JSON.stringify(datos) });
}

export function cambiarEstadoCliente(id: number, activo: boolean) {
    return api<Cliente>(`/api/clientes/${id}/estado`, {
        method: "PATCH", body: JSON.stringify({ activo }),
    });
}

export function listarUbicacionesCliente(clienteId: number, pagina = 1) {
    const query = new URLSearchParams({
        clienteId: String(clienteId), estado: "todos", pagina: String(pagina), limite: "10",
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
