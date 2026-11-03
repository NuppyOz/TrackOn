import { useEffect, useState, type SubmitEvent } from "react";
import { cambiarEstadoServicio, crearServicio, editarServicio, listarServicios } from "./servicios.api";
import type { EstadoServicio, Servicio, ServicioInput } from "./servicios.types";
import { useFiltrosListado } from '../../shared/useFiltrosListado';
import { DataTable, TablePagination } from '../../shared/ui';

const vacio = { codigo: "", nombre: "", descripcion: "" };
const filtrosIniciales = { estado: 'todos' as EstadoServicio, buscar: '' };

interface ServiciosManagerProps {
    puedeGestionar?: boolean;
}

export default function ServiciosManager({ puedeGestionar = true }: Readonly<ServiciosManagerProps>) {
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [formulario, setFormulario] = useState(vacio);
    const [editando, setEditando] = useState<number | null>(null);
    const { filtros, aplicados, pendiente, cambiarFiltros, aplicarFiltros } = useFiltrosListado(filtrosIniciales);
    const [consultando, setCargando] = useState(true);
    const cargando = consultando || pendiente;
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: "error" | "exito"; texto: string } | null>(null);
    const [formularioVisible, setFormularioVisible] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [hayMas, setHayMas] = useState(false);

    function cargar() {
        setCargando(true);
        aplicarFiltros(aplicados);
    }
    useEffect(() => {
        let vigente = true;
        void (pagina === 1 ? listarServicios(aplicados.estado, aplicados.buscar) : listarServicios(aplicados.estado, aplicados.buscar, pagina))
            .then(resultado => { if (vigente) { setServicios(resultado.items); setHayMas(resultado.hayMas); } })
            .catch(error => {
                if (!vigente) return;
                setServicios([]);
                setMensaje({
                    tipo: "error",
                    texto: error instanceof Error ? error.message : "No se pudo cargar el catálogo.",
                });
            })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [aplicados, pagina]);

    function filtrar(nuevos: typeof filtrosIniciales, esperar = false) {
        setMensaje(null); setCargando(true);
        setPagina(1); cambiarFiltros(nuevos, esperar);
    }

    function cancelar() {
        setFormulario(vacio);
        setEditando(null);
        setFormularioVisible(false);
    }
    function editar(servicio: Servicio) {
        if (!puedeGestionar) return;
        setEditando(servicio.id);
        setFormulario({ codigo: servicio.codigo, nombre: servicio.nombre, descripcion: servicio.descripcion ?? "" });
        setFormularioVisible(true);
        setMensaje(null);
    }
    async function guardar(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar) return;
        setGuardando(true);
        setMensaje(null);
        if (!formulario.codigo.trim() || !formulario.nombre.trim()) {
            setMensaje({ tipo: "error", texto: "Código y nombre son obligatorios." });
            setGuardando(false);
            return;
        }
        const datos: ServicioInput = { ...formulario, descripcion: formulario.descripcion || null };
        try {
            if (editando) await editarServicio(editando, datos);
            else await crearServicio(datos);
            setMensaje({ tipo: "exito", texto: editando ? "Servicio actualizado." : "Servicio creado." });
            cancelar();
            await cargar();
        } catch (error) {
            setMensaje({
                tipo: "error",
                texto: error instanceof Error ? error.message : "No se pudo guardar el servicio.",
            });
        } finally {
            setGuardando(false);
        }
    }
    async function cambiarEstado(servicio: Servicio) {
        if (!puedeGestionar) return;
        setMensaje(null);
        try {
            await cambiarEstadoServicio(servicio.id, !servicio.activo);
            setMensaje({ tipo: "exito", texto: `Servicio ${servicio.activo ? "desactivado" : "reactivado"}.` });
            await cargar();
        } catch (error) {
            setMensaje({
                tipo: "error",
                texto: error instanceof Error ? error.message : "No se pudo cambiar el estado.",
            });
        }
    }

    let titulo = "Catálogo de servicios";
    let descripcion = "Define los trabajos disponibles para las órdenes de servicio.";
    if (formularioVisible) {
        titulo = editando ? "Editar servicio" : "Crear servicio";
        descripcion = "Completa los datos para registrar el servicio.";
    }
    let textoGuardar = "Crear servicio";
    if (editando) textoGuardar = "Guardar cambios";
    if (guardando) textoGuardar = "Guardando…";

    function contenidoLista() {
        if (cargando) return <p className="empty">Cargando servicios…</p>;
        if (servicios.length === 0) return <p className="empty">No hay servicios que coincidan.</p>;

        return (
            <DataTable label="Servicios">
                    <thead>
                        <tr>
                            <th>Servicio</th>
                            <th>Descripción</th>
                            <th>Estado</th>
                            <th aria-label="Acciones"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {servicios.map(servicio => (
                            <tr key={servicio.id}>
                                <td data-label="Servicio">
                                    <strong>{servicio.nombre}</strong>
                                    <span>{servicio.codigo}</span>
                                </td>
                                <td data-label="Descripción">{servicio.descripcion ?? "Sin descripción"}</td>
                                <td data-label="Estado">
                                    <span className={`status ${servicio.activo ? "active" : "inactive"}`}>
                                        {servicio.activo ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                                <td className="actions">
                                    {puedeGestionar && (
                                        <>
                                            <button type="button" onClick={() => editar(servicio)}>
                                                Ver / editar
                                            </button>

                                            <button type="button" onClick={() => void cambiarEstado(servicio)}>
                                                {servicio.activo ? "Desactivar" : "Activar"}
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
            </DataTable>
        );
    }

    return (
        <section aria-labelledby="servicios-titulo">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">Configuración</p>
                    <h2 id="servicios-titulo">{titulo}</h2>
                    <p>{descripcion}</p>
                </div>
                {puedeGestionar && !formularioVisible && (
                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                            cancelar();
                            setFormularioVisible(true);
                        }}
                    >
                        + Crear servicio
                    </button>
                )}
            </div>
            {mensaje && (
                <div className={`notice ${mensaje.tipo}`} role="alert">
                    {mensaje.texto}
                </div>
            )}
            <div className="panel-grid" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
                {formularioVisible && (
                    <form className="card form-card" onSubmit={guardar}>
                        <div className="card-title">
                            <h3>Datos del servicio</h3>
                            <button type="button" className="text-button" onClick={cancelar}>
                                ← Servicios
                            </button>
                        </div>
                        <label>
                            <span>Código</span>
                            <input
                                required
                                maxLength={30}
                                value={formulario.codigo}
                                onChange={e => setFormulario({ ...formulario, codigo: e.target.value })}
                            />
                        </label>
                        <label>
                            <span>Nombre</span>
                            <input
                                required
                                maxLength={150}
                                value={formulario.nombre}
                                onChange={e => setFormulario({ ...formulario, nombre: e.target.value })}
                            />
                        </label>
                        <label>
                            <span>Descripción</span>
                            <textarea
                                rows={4}
                                value={formulario.descripcion}
                                onChange={e => setFormulario({ ...formulario, descripcion: e.target.value })}
                            />
                        </label>
                        <button type="submit" className="primary-button" disabled={guardando}>
                            {textoGuardar}
                        </button>
                    </form>
                )}
                {!formularioVisible && (
                    <div className="card list-card">
                        <form
                            className="filters service-filters"
                            onSubmit={e => {
                                e.preventDefault();
                                setMensaje(null);
                                setCargando(true); aplicarFiltros();
                            }}
                        >
                            <input
                                aria-label="Buscar servicio"
                                placeholder="Buscar por código o nombre"
                                value={filtros.buscar}
                                maxLength={150}
                                onChange={e => filtrar({ ...filtros, buscar: e.target.value }, true)}
                            />
                            <select
                                aria-label="Filtrar por estado"
                                value={filtros.estado}
                                onChange={e => filtrar({ ...filtros, estado: e.target.value as EstadoServicio })}
                            >
                                <option value="todos">Todos</option>
                                <option value="activos">Activos</option>
                                <option value="inactivos">Inactivos</option>
                            </select>
                            <button type="submit" className="secondary-button">
                                Buscar
                            </button>
                            <button type="button" className="text-button" onClick={() => filtrar(filtrosIniciales)}>Limpiar</button>
                        </form>
                        <TablePagination pagina={pagina} hayMas={hayMas} cargando={cargando} cantidad={servicios.length} etiqueta="servicios" onPagina={setPagina} />
                        {contenidoLista()}
                    </div>
                )}
            </div>
        </section>
    );
}
