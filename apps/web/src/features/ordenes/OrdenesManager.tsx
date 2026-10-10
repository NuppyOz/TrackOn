import { useEffect, useState, type SyntheticEvent } from 'react';
import { listarUbicaciones } from '../equipos/equipos.api';
import type { Ubicacion } from '../equipos/equipos.types';
import { cambiarEstadoOrden, crearOrden, listarOrdenes, obtenerOrden } from './ordenes.api';
import type { EstadoOrden, FiltrosOrdenes, OrdenDetalle, OrdenNueva, OrdenResumen, PrioridadOrden } from './ordenes.types';

const filtrosIniciales: FiltrosOrdenes = { estado: '', buscar: '', pagina: 1, limite: 25 };
const estados: EstadoOrden[] = [
    'BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA', 'CANCELADA',
];
const siguientes: Partial<Record<EstadoOrden, EstadoOrden[]>> = {
    BORRADOR: ['PENDIENTE', 'CANCELADA'],
    PENDIENTE: ['CANCELADA'],
    ASIGNADA: ['EN_EJECUCION', 'CANCELADA'],
    EN_EJECUCION: ['EN_REVISION', 'CANCELADA'],
    EN_REVISION: ['EN_EJECUCION', 'CERRADA'],
};
const nombreEstado = (estado: string) => estado.replaceAll('_', ' ');
const fecha = (valor: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(valor));
const nombreCliente = (ubicacion: Ubicacion) => ubicacion.cliente.organizacion?.razonSocial ??
    [ubicacion.cliente.persona?.firstName, ubicacion.cliente.persona?.firstLastName].filter(Boolean).join(' ');

interface Props { puedeGestionar?: boolean }

export default function OrdenesManager({ puedeGestionar = true }: Readonly<Props>) {
    const [filtros, setFiltros] = useState<FiltrosOrdenes>(filtrosIniciales);
    const [pagina, setPagina] = useState<{ items: OrdenResumen[]; hayMas: boolean }>({ items: [], hayMas: false });
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [detalle, setDetalle] = useState<OrdenDetalle | null>(null);
    const [creando, setCreando] = useState(false);
    const [ubicacionId, setUbicacionId] = useState('');
    const [solicitud, setSolicitud] = useState('');
    const [prioridad, setPrioridad] = useState<PrioridadOrden>('MEDIA');
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [nuevoEstado, setNuevoEstado] = useState<EstadoOrden | ''>('');
    const [motivo, setMotivo] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

    useEffect(() => {
        let vigente = true;
        Promise.all([listarOrdenes(filtrosIniciales), listarUbicaciones()])
            .then(([respuesta, ubicacionesActivas]) => {
                if (!vigente) return;
                setPagina(respuesta);
                setUbicaciones(ubicacionesActivas);
            })
            .catch((error: unknown) => {
                if (vigente) mostrarError(error, 'No se pudieron cargar las órdenes.');
            })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, []);

    function mostrarError(error: unknown, defecto: string) {
        setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : defecto });
    }

    async function cargar(nuevosFiltros = filtros) {
        setCargando(true);
        try {
            const respuesta = await listarOrdenes(nuevosFiltros);
            setPagina(respuesta);
            setFiltros(nuevosFiltros);
        } catch (error) {
            mostrarError(error, 'No se pudo consultar el listado.');
        } finally {
            setCargando(false);
        }
    }

    function limpiarFormulario() {
        setUbicacionId(''); setSolicitud(''); setPrioridad('MEDIA'); setFechaProgramada(''); setCreando(false);
    }

    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar || guardando) return;
        setGuardando(true); setMensaje(null);
        try {
            const datos: OrdenNueva = {
                ubicacionId: Number(ubicacionId), solicitud: solicitud.trim(), prioridad,
                fechaProgramada: fechaProgramada ? new Date(fechaProgramada).toISOString() : null,
            };
            const nueva = await crearOrden(datos);
            limpiarFormulario();
            setMensaje({ tipo: 'exito', texto: `Orden OT-${nueva.numero} creada.` });
            await cargar(filtrosIniciales);
        } catch (error) {
            mostrarError(error, 'No se pudo registrar la orden.');
        } finally {
            setGuardando(false);
        }
    }

    async function verDetalle(id: number) {
        setMensaje(null);
        try {
            const orden = await obtenerOrden(id);
            setDetalle(orden);
            setNuevoEstado(''); setMotivo('');
        } catch (error) {
            mostrarError(error, 'No se pudo consultar la orden.');
        }
    }

    async function actualizarEstado(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detalle || !nuevoEstado || !puedeGestionar || guardando) return;
        setGuardando(true); setMensaje(null);
        try {
            const actualizada = await cambiarEstadoOrden(detalle.id, nuevoEstado, motivo.trim());
            setDetalle(actualizada);
            setNuevoEstado(''); setMotivo('');
            setMensaje({ tipo: 'exito', texto: 'Estado actualizado correctamente.' });
            await cargar();
        } catch (error) {
            mostrarError(error, 'No se pudo cambiar el estado.');
        } finally {
            setGuardando(false);
        }
    }

    function cambiarFiltroEstado(estado: EstadoOrden | '') {
        const siguientesFiltros = { ...filtros, estado, pagina: 1 };
        setFiltros(siguientesFiltros);
        void cargar(siguientesFiltros);
    }

    function contenidoDetalle() {
        if (!detalle) return null;
        const opciones = siguientes[detalle.estadoCodigo] ?? [];
        return (
            <section className="card tk-detail" aria-label="Detalle de orden">
                <div className="tk-detail-head">
                    <div>
                        <h3>OT-{detalle.numero}</h3>
                        <span className="tk-status-badge" data-status={detalle.estadoCodigo}>
                            {nombreEstado(detalle.estadoCodigo)}
                        </span>
                    </div>
                    <button type="button" className="tk-action-button" onClick={() => setDetalle(null)}>
                        Cerrar detalle
                    </button>
                </div>
                <div className="tk-detail-grid">
                    <div className="tk-detail-item"><small>Cliente</small><strong>{detalle.clienteNombreRegistrado}</strong></div>
                    <div className="tk-detail-item"><small>Ubicación</small><strong>{detalle.ubicacionNombreRegistrado}</strong><p>{detalle.direccionRegistrada}</p></div>
                    <div className="tk-detail-item"><small>Solicitud</small><p>{detalle.solicitud}</p></div>
                    <div className="tk-detail-item"><small>Prioridad / Programación</small><strong>{detalle.prioridad}</strong>
                        <p>{detalle.fechaProgramada ? fecha(detalle.fechaProgramada) : 'Sin programar'}</p>
                    </div>
                </div>
                <h4>Historial de estados</h4>
                {detalle.historial.length === 0 ? (
                    <p>Sin movimientos.</p>
                ) : (
                    <ul className="tk-history">
                        {detalle.historial.map(item => (
                            <li key={item.id}>
                                <strong>{nombreEstado(item.estadoNuevo)}</strong> · {item.motivo ?? 'Sin motivo'}
                                <small>{fecha(item.fecha)}</small>
                            </li>
                        ))}
                    </ul>
                )}
                {puedeGestionar && opciones.length > 0 && (
                    <>
                        <h4>Actualizar estado</h4>
                        <form className="tk-state-form" onSubmit={event => void actualizarEstado(event)}>
                            <label>Nuevo estado
                                <select aria-label="Nuevo estado" value={nuevoEstado}
                                    onChange={event => setNuevoEstado(event.target.value as EstadoOrden | '')} required>
                                    <option value="">Selecciona un estado</option>
                                    {opciones.map(estado => (
                                        <option key={estado} value={estado}>{nombreEstado(estado)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>Motivo
                                <textarea aria-label="Motivo del cambio" value={motivo}
                                    onChange={event => setMotivo(event.target.value)} minLength={3}
                                    maxLength={1000} required rows={2} />
                            </label>
                            <button type="submit" className="primary-button" disabled={guardando}>Cambiar estado</button>
                        </form>
                    </>
                )}
            </section>
        );
    }

    function contenidoLista() {
        if (cargando) return <div className="tk-list-empty">Cargando órdenes…</div>;
        if (pagina.items.length === 0) return (
            <div className="tk-list-empty">
                <div>
                    <strong>Aún no hay órdenes para mostrar</strong>
                    <p>No hay órdenes para estos filtros.</p>
                </div>
            </div>
        );
        return (
            <div className="table-wrap">
                <table className="tk-orders-table">
                    <thead>
                        <tr>
                            <th>OT</th>
                            <th>Cliente / servicio</th>
                            <th>Asignación</th>
                            <th>Programación</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagina.items.map(orden => (
                            <tr key={orden.id}>
                                <td data-label="OT">
                                    <strong className="tk-ot-number">OT-{orden.numero}</strong>
                                    <small>{orden.prioridad}</small>
                                </td>
                                <td data-label="Cliente / solicitud">
                                    <strong>{orden.clienteNombreRegistrado}</strong>
                                    <small className="tk-order-desc" title={orden.solicitud}>{orden.solicitud}</small>
                                </td>
                                <td data-label="Asignación">
                                    <strong className="tk-cell-muted">Sin asignar</strong>
                                    <small>{orden.ubicacionNombreRegistrado}</small>
                                </td>
                                <td data-label="Programación">
                                    <strong>{orden.fechaProgramada ? fecha(orden.fechaProgramada) : 'Sin programar'}</strong>
                                    <small>{orden.fechaProgramada ? new Intl.DateTimeFormat('es-NI', { timeStyle: 'short' }).format(new Date(orden.fechaProgramada)) : '—'}</small>
                                </td>
                                <td data-label="Estado">
                                    <span className="tk-status-badge" data-status={orden.estadoCodigo}>
                                        {nombreEstado(orden.estadoCodigo)}
                                    </span>
                                </td>
                                <td data-label="Acción">
                                    <button type="button" className="tk-action-button"
                                        onClick={() => void verDetalle(orden.id)}>Ver detalle</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    function formularioAlta() {
        return (
            <div className="tk-order-form-layout">
                <form className="card form-card" onSubmit={event => void guardar(event)}>
                    <div className="card-title">
                        <h3>Datos de la orden</h3>
                        <button type="button" className="text-button" onClick={limpiarFormulario}>Cancelar</button>
                    </div>
                    <div className="tk-form-fields">
                        <label className="tk-wide">Ubicación
                            <select aria-label="Ubicación" required value={ubicacionId}
                                onChange={event => setUbicacionId(event.target.value)}>
                                <option value="">Selecciona una ubicación</option>
                                {ubicaciones.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {nombreCliente(item)} · {item.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Prioridad
                            <select aria-label="Prioridad" value={prioridad}
                                onChange={event => setPrioridad(event.target.value as PrioridadOrden)}>
                                <option value="BAJA">Baja</option>
                                <option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option>
                                <option value="URGENTE">Urgente</option>
                            </select>
                        </label>
                        <label>Fecha programada
                            <input aria-label="Fecha programada" type="datetime-local" value={fechaProgramada}
                                onChange={event => setFechaProgramada(event.target.value)} />
                        </label>
                        <label className="tk-wide">Solicitud
                            <textarea aria-label="Solicitud" minLength={5} maxLength={5000} required rows={5}
                                placeholder="Describe qué debe realizar el personal técnico."
                                value={solicitud} onChange={event => setSolicitud(event.target.value)} />
                        </label>
                    </div>
                    <div className="tk-form-actions">
                        <button type="button" className="secondary-button" onClick={limpiarFormulario}>Volver al listado</button>
                        <button type="submit" className="primary-button" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Registrar orden'}
                        </button>
                    </div>
                </form>
                <aside className="card tk-summary-panel">
                    <h3>Resumen de registro</h3>
                    <p>Esta orden se guardará con el cliente y la dirección de la ubicación seleccionada.</p>
                    <ul>
                        <li>Estado inicial: pendiente</li>
                        <li>Asignación: disponible en una fase posterior</li>
                        <li>El número de OT lo genera el sistema</li>
                    </ul>
                </aside>
            </div>
        );
    }

    return (
        <section className="tk-orders" aria-labelledby="ordenes-titulo">
            <div className="tk-breadcrumb">Gestión operativa › <span>Órdenes</span></div>
            <div className="tk-orders-heading">
                <div>
                    <h2 id="ordenes-titulo">{creando ? 'Nueva orden de trabajo' : 'Órdenes de trabajo'}</h2>
                    <p>{creando
                        ? 'Registra la solicitud, su prioridad y programación inicial.'
                        : 'Consulta y da seguimiento a las órdenes de trabajo.'}</p>
                </div>
                {puedeGestionar && !creando && (
                    <button type="button" className="primary-button tk-order-create"
                        onClick={() => { setDetalle(null); setCreando(true); }}>+ Nueva orden</button>
                )}
            </div>
            {mensaje && <div className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</div>}
            {creando && puedeGestionar && formularioAlta()}
            {!creando && (
                <>
                    <form className="tk-filters" onSubmit={event => {
                        event.preventDefault(); void cargar({ ...filtros, pagina: 1 });
                    }}>
                        <div className="tk-search-group">
                            <input aria-label="Buscar órdenes" placeholder="Buscar cliente o solicitud"
                                value={filtros.buscar}
                                onChange={event => setFiltros({ ...filtros, buscar: event.target.value })} />
                        </div>
                        <div className="tk-status-tabs" role="group" aria-label="Filtros rápidos de estado">
                            {([
                                { codigo: '', titulo: 'Todas' },
                                { codigo: 'ASIGNADA', titulo: 'Asignadas' },
                                { codigo: 'EN_EJECUCION', titulo: 'En ejecución' },
                                { codigo: 'EN_REVISION', titulo: 'En revisión' },
                                { codigo: 'CERRADA', titulo: 'Cerradas' },
                            ] as const).map(item => (
                                <button key={item.codigo} type="button" className="tk-status-tab"
                                    aria-pressed={filtros.estado === item.codigo}
                                    onClick={() => cambiarFiltroEstado(item.codigo)}>{item.titulo}</button>
                            ))}
                        </div>
                        <select className="tk-advanced-state" aria-label="Filtrar estado de orden" value={filtros.estado}
                            onChange={event => setFiltros({ ...filtros, estado: event.target.value as EstadoOrden | '' })}>
                            <option value="">Todos los estados</option>
                            {estados.map(item => <option key={item} value={item}>{nombreEstado(item)}</option>)}
                        </select>
                        <button type="submit" className="secondary-button tk-search-submit">Buscar</button>
                    </form>
                    <div className="card tk-table-card">
                        {contenidoLista()}
                        <div className="tk-table-pagination">
                            <button type="button" className="secondary-button" disabled={cargando || filtros.pagina === 1}
                                onClick={() => void cargar({ ...filtros, pagina: filtros.pagina - 1 })}>Anterior</button>
                            <span>Página {filtros.pagina}</span>
                            <button type="button" className="secondary-button" disabled={cargando || !pagina.hayMas}
                                onClick={() => void cargar({ ...filtros, pagina: filtros.pagina + 1 })}>Siguiente</button>
                        </div>
                    </div>
                    {contenidoDetalle()}
                </>
            )}
        </section>
    );
}
