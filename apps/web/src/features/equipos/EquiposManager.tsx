import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { cambiarEstadoEquipo, crearEquipo, editarEquipo, listarEquipos, listarUbicaciones } from "./equipos.api";
import type { Equipo, EquipoFiltros, EquipoInput, Ubicacion } from "./equipos.types";

const LIMITE = 25;
const filtrosIniciales: EquipoFiltros = {
    clienteId: "",
    ubicacionId: "",
    codigo: "",
    numeroSerie: "",
    estado: "activos",
};
const formularioVacio = {
    ubicacionId: "",
    codigo: "",
    tipo: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
};
type Formulario = typeof formularioVacio;
type Mensaje = { tipo: "error" | "exito"; texto: string };

function nombreCliente(ubicacion: Ubicacion): string {
    const cliente = ubicacion.cliente;
    let nombre = cliente.codigo;
    if (cliente.persona) {
        nombre = `${cliente.persona.firstName} ${cliente.persona.firstLastName}`;
    }
    if (cliente.organizacion?.razonSocial) {
        nombre = cliente.organizacion.razonSocial;
    }
    if (cliente.organizacion?.nombreComercial) {
        nombre = cliente.organizacion.nombreComercial;
    }
    return `${cliente.codigo} · ${nombre}`;
}

function textoAccionEstado(equipo: Equipo, cambiandoId: number | null): string {
    if (cambiandoId === equipo.id) return "Procesando…";
    return equipo.activo ? "Desactivar" : "Activar";
}

function textoError(error: unknown, mensaje: string): string {
    return error instanceof Error ? error.message : mensaje;
}

interface EquiposManagerProps {
    puedeGestionar?: boolean;
}

export default function EquiposManager({ puedeGestionar = true }: Readonly<EquiposManagerProps>) {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [filtros, setFiltros] = useState<EquipoFiltros>(filtrosIniciales);
    const [filtrosAplicados, setFiltrosAplicados] = useState<EquipoFiltros>(filtrosIniciales);
    const [pagina, setPagina] = useState(1);
    const [hayMas, setHayMas] = useState(false);
    const [recarga, setRecarga] = useState(0);
    const [formulario, setFormulario] = useState<Formulario>(formularioVacio);
    const [equipoEnEdicion, setEquipoEnEdicion] = useState<Equipo | null>(null);
    const [formularioVisible, setFormularioVisible] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const clientes = useMemo(() => {
        const unicos = new Map<number, Ubicacion>();
        for (const ubicacion of ubicaciones) {
            if (!unicos.has(ubicacion.cliente.id)) {
                unicos.set(ubicacion.cliente.id, ubicacion);
            }
        }
        return [...unicos.values()];
    }, [ubicaciones]);

    const ubicacionesFiltradas = useMemo(
        () => (filtros.clienteId ? ubicaciones.filter(u => u.cliente.id === Number(filtros.clienteId)) : ubicaciones),
        [filtros.clienteId, ubicaciones],
    );

    const ubicacionesFormulario = useMemo(() => {
        const disponibles = [...ubicaciones];
        const actual = equipoEnEdicion?.ubicacion;
        if (actual && !disponibles.some(u => u.id === actual.id)) {
            disponibles.push(actual);
        }
        return disponibles;
    }, [ubicaciones, equipoEnEdicion]);

    useEffect(() => {
        let vigente = true;
        void listarUbicaciones()
            .then(datos => {
                if (vigente) setUbicaciones(datos);
            })
            .catch((error: unknown) => {
                if (vigente)
                    setMensaje({
                        tipo: "error",
                        texto: textoError(error, "No se pudieron cargar las ubicaciones."),
                    });
            });
        return () => {
            vigente = false;
        };
    }, []);

    useEffect(() => {
        let vigente = true;
        void listarEquipos({ ...filtrosAplicados, pagina, limite: LIMITE })
            .then(resultado => {
                if (!vigente) return;
                if (pagina > 1 && resultado.items.length === 0) {
                    setPagina(anterior => Math.max(1, anterior - 1));
                    return;
                }
                setEquipos(resultado.items);
                setHayMas(resultado.hayMas);
            })
            .catch((error: unknown) => {
                if (vigente)
                    setMensaje({
                        tipo: "error",
                        texto: textoError(error, "No se pudo cargar el inventario."),
                    });
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [filtrosAplicados, pagina, recarga]);

    function actualizarCampo(campo: keyof Formulario, valor: string) {
        setFormulario(actual => ({ ...actual, [campo]: valor }));
    }

    function cerrarFormulario() {
        setFormularioVisible(false);
        setEquipoEnEdicion(null);
        setFormulario(formularioVacio);
    }

    function comenzarRegistro() {
        if (!puedeGestionar) return;
        cerrarFormulario();
        setMensaje(null);
        setFormularioVisible(true);
    }

    function comenzarEdicion(equipo: Equipo) {
        if (!puedeGestionar) return;
        setEquipoEnEdicion(equipo);
        setFormulario({
            ubicacionId: String(equipo.ubicacion.id),
            codigo: equipo.codigo,
            tipo: equipo.tipo,
            marca: equipo.marca ?? "",
            modelo: equipo.modelo ?? "",
            numeroSerie: equipo.numeroSerie ?? "",
        });
        setMensaje(null);
        setFormularioVisible(true);
    }

    function buscar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setMensaje(null);
        setCargando(true);
        setPagina(1);
        setFiltrosAplicados({ ...filtros });
        setRecarga(n => n + 1);
    }

    function limpiarFiltros() {
        setMensaje(null);
        setFiltros({ ...filtrosIniciales });
        setFiltrosAplicados({ ...filtrosIniciales });
        setPagina(1);
        setCargando(true);
        setRecarga(n => n + 1);
    }

    function actualizarListado() {
        setCargando(true);
        setRecarga(n => n + 1);
    }

    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar) return;
        if (guardando) return;
        setMensaje(null);
        const ubicacionId = Number(formulario.ubicacionId);
        const ubicacion = ubicacionesFormulario.find(u => u.id === ubicacionId);
        const esUbicacionActual = equipoEnEdicion?.ubicacion.id === ubicacionId;

        if (!ubicacion || !formulario.codigo.trim() || !formulario.tipo.trim()) {
            setMensaje({ tipo: "error", texto: "Ubicación, código y tipo son obligatorios." });
            return;
        }
        if (!esUbicacionActual && (ubicacion.activa === false || ubicacion.cliente.activo === false)) {
            setMensaje({ tipo: "error", texto: "La ubicación y el cliente deben estar activos." });
            return;
        }

        const datos: EquipoInput = {
            ubicacionId,
            codigo: formulario.codigo.trim(),
            tipo: formulario.tipo.trim(),
            marca: formulario.marca.trim() || null,
            modelo: formulario.modelo.trim() || null,
            numeroSerie: formulario.numeroSerie.trim() || null,
        };

        setGuardando(true);
        try {
            if (equipoEnEdicion) {
                const cambios: Partial<EquipoInput> = {
                    codigo: datos.codigo,
                    tipo: datos.tipo,
                    marca: datos.marca,
                    modelo: datos.modelo,
                    numeroSerie: datos.numeroSerie,
                };
                if (!esUbicacionActual) cambios.ubicacionId = ubicacionId;
                await editarEquipo(equipoEnEdicion.id, cambios);
            } else {
                await crearEquipo(datos);
            }
            setMensaje({
                tipo: "exito",
                texto: equipoEnEdicion ? "Equipo actualizado correctamente." : "Equipo registrado correctamente.",
            });
            cerrarFormulario();
            actualizarListado();
        } catch (error) {
            setMensaje({ tipo: "error", texto: textoError(error, "No se pudo guardar el equipo.") });
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(equipo: Equipo) {
        if (!puedeGestionar) return;
        if (cambiandoEstadoId !== null) return;
        setCambiandoEstadoId(equipo.id);
        setMensaje(null);
        try {
            await cambiarEstadoEquipo(equipo.id, !equipo.activo);
            setMensaje({ tipo: "exito", texto: equipo.activo ? "Equipo desactivado." : "Equipo reactivado." });
            actualizarListado();
        } catch (error) {
            setMensaje({ tipo: "error", texto: textoError(error, "No se pudo cambiar el estado.") });
        } finally {
            setCambiandoEstadoId(null);
        }
    }

    const editando = equipoEnEdicion !== null;
    let titulo = "Equipos";
    if (formularioVisible) {
        titulo = editando ? "Editar equipo" : "Registrar equipo";
    }
    const descripcion = formularioVisible
        ? "Completa la información del activo técnico."
        : "Controla los activos instalados por cliente y ubicación.";
    let textoGuardar = "Registrar equipo";
    if (editando) textoGuardar = "Guardar cambios";
    if (guardando) textoGuardar = "Guardando…";

    const ubicacionAnteriorInactiva =
        equipoEnEdicion?.ubicacion.activa === false || equipoEnEdicion?.ubicacion.cliente.activo === false;

    return (
        <section className="equipos-page" aria-labelledby="equipos-titulo">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Inventario</p>
                    <h2 id="equipos-titulo">{titulo}</h2>
                    <p>{descripcion}</p>
                </div>
                {puedeGestionar && !formularioVisible && (
                    <button className="primary-button" type="button" onClick={comenzarRegistro}>
                        + Registrar equipo
                    </button>
                )}
            </div>

            {mensaje?.tipo === "error" && (
                <div className="notice error" role="alert">
                    {mensaje.texto}
                </div>
            )}
            {mensaje?.tipo === "exito" && <output className="notice exito">{mensaje.texto}</output>}

            <div className="panel-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
                {formularioVisible ? (
                    <form className="card form-card" onSubmit={event => void guardar(event)}>
                        <div className="card-title">
                            <h3>Datos del equipo</h3>
                            <button
                                className="text-button"
                                type="button"
                                onClick={cerrarFormulario}
                                disabled={guardando}
                            >
                                ← Equipos
                            </button>
                        </div>
                        <label>
                            <span>Ubicación</span>
                            <select
                                required
                                value={formulario.ubicacionId}
                                onChange={event => actualizarCampo("ubicacionId", event.target.value)}
                            >
                                <option value="">Seleccionar ubicación</option>
                                {ubicacionesFormulario.map(u => {
                                    const inactiva = u.activa === false || u.cliente.activo === false;
                                    const esActual = equipoEnEdicion?.ubicacion.id === u.id;
                                    return (
                                        <option key={u.id} value={u.id} disabled={inactiva && !esActual}>
                                            {`${nombreCliente(u)} · ${u.nombre}${inactiva ? " (inactiva)" : ""}`}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                        {ubicacionAnteriorInactiva && (
                            <p className="form-hint">
                                La ubicación original está inactiva. Puedes conservarla o seleccionar una ubicación
                                activa.
                            </p>
                        )}
                        <div className="two-columns">
                            <label>
                                <span>Código</span>
                                <input
                                    required
                                    maxLength={40}
                                    value={formulario.codigo}
                                    onChange={event => actualizarCampo("codigo", event.target.value)}
                                />
                            </label>
                            <label>
                                <span>Tipo</span>
                                <input
                                    required
                                    maxLength={100}
                                    value={formulario.tipo}
                                    onChange={event => actualizarCampo("tipo", event.target.value)}
                                />
                            </label>
                        </div>
                        <div className="two-columns">
                            <label>
                                <span>Marca</span>
                                <input
                                    maxLength={100}
                                    value={formulario.marca}
                                    onChange={event => actualizarCampo("marca", event.target.value)}
                                />
                            </label>
                            <label>
                                <span>Modelo</span>
                                <input
                                    maxLength={100}
                                    value={formulario.modelo}
                                    onChange={event => actualizarCampo("modelo", event.target.value)}
                                />
                            </label>
                        </div>
                        <label>
                            <span>Número de serie</span>
                            <input
                                maxLength={150}
                                value={formulario.numeroSerie}
                                onChange={event => actualizarCampo("numeroSerie", event.target.value)}
                            />
                        </label>
                        <button className="primary-button" type="submit" disabled={guardando}>
                            {textoGuardar}
                        </button>
                    </form>
                ) : (
                    <div className="card list-card">
                        <form className="filters" onSubmit={buscar}>
                            <select
                                aria-label="Filtrar por cliente"
                                value={filtros.clienteId}
                                onChange={event =>
                                    setFiltros(actual => ({
                                        ...actual,
                                        clienteId: event.target.value,
                                        ubicacionId: "",
                                    }))
                                }
                            >
                                <option value="">Todos los clientes</option>
                                {clientes.map(u => (
                                    <option key={u.cliente.id} value={u.cliente.id}>
                                        {nombreCliente(u)}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label="Filtrar por ubicación"
                                value={filtros.ubicacionId}
                                onChange={event =>
                                    setFiltros(actual => ({ ...actual, ubicacionId: event.target.value }))
                                }
                            >
                                <option value="">Todas las ubicaciones</option>
                                {ubicacionesFiltradas.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre}
                                    </option>
                                ))}
                            </select>
                            <input
                                aria-label="Buscar por código"
                                placeholder="Código"
                                value={filtros.codigo}
                                onChange={event => setFiltros(actual => ({ ...actual, codigo: event.target.value }))}
                            />
                            <input
                                aria-label="Buscar por serie"
                                placeholder="N.º de serie"
                                value={filtros.numeroSerie}
                                onChange={event =>
                                    setFiltros(actual => ({ ...actual, numeroSerie: event.target.value }))
                                }
                            />
                            <select
                                aria-label="Filtrar por estado"
                                value={filtros.estado}
                                onChange={event =>
                                    setFiltros(actual => ({
                                        ...actual,
                                        estado: event.target.value as EquipoFiltros["estado"],
                                    }))
                                }
                            >
                                <option value="activos">Activos</option>
                                <option value="inactivos">Inactivos</option>
                                <option value="todos">Todos</option>
                            </select>
                            <button className="secondary-button" type="submit" disabled={cargando}>
                                Buscar
                            </button>
                            <button className="text-button" type="button" onClick={limpiarFiltros} disabled={cargando}>
                                Limpiar
                            </button>
                        </form>

                        {cargando && <output className="empty">Cargando inventario…</output>}
                        {!cargando && equipos.length === 0 && (
                            <p className="empty">No hay equipos que coincidan con los filtros.</p>
                        )}
                        {!cargando && equipos.length > 0 && (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Equipo</th>
                                            <th>Cliente / ubicación</th>
                                            <th>Serie</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {equipos.map(equipo => (
                                            <tr key={equipo.id}>
                                                <td>
                                                    <strong>{equipo.codigo}</strong>
                                                    <span>{`${equipo.tipo} · ${[equipo.marca, equipo.modelo].filter(Boolean).join(" ") || "Sin marca/modelo"}`}</span>
                                                </td>
                                                <td>
                                                    <strong>{nombreCliente(equipo.ubicacion)}</strong>
                                                    <span>{equipo.ubicacion.nombre}</span>
                                                </td>
                                                <td>{equipo.numeroSerie ?? "—"}</td>
                                                <td>
                                                    <span className={`status ${equipo.activo ? "active" : "inactive"}`}>
                                                        {equipo.activo ? "Activo" : "Inactivo"}
                                                    </span>
                                                </td>
                                                <td className="actions">
                                                    {puedeGestionar && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={cambiandoEstadoId !== null}
                                                                onClick={() => comenzarEdicion(equipo)}
                                                            >
                                                                Editar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={cambiandoEstadoId !== null}
                                                                onClick={() => void cambiarEstado(equipo)}
                                                            >
                                                                {textoAccionEstado(equipo, cambiandoEstadoId)}
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="equipos-pagination">
                            <p aria-live="polite">{`Página ${pagina} · ${LIMITE} registros por página`}</p>
                            <div className="equipos-pagination-actions">
                                <button
                                    type="button"
                                    disabled={cargando || pagina <= 1}
                                    onClick={() => {
                                        setCargando(true);
                                        setPagina(p => Math.max(1, p - 1));
                                    }}
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    disabled={cargando || !hayMas}
                                    onClick={() => {
                                        setCargando(true);
                                        setPagina(p => p + 1);
                                    }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
