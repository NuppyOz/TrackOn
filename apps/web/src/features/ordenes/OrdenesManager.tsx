import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import EquiposOrdenPanel from './EquiposOrdenPanel';
import AsignarOrdenPanel from './AsignarOrdenPanel';
import { listarUbicaciones } from '../equipos/equipos.api';
import type { Ubicacion } from '../equipos/equipos.types';
import { cambiarEstadoOrden, ejecutarOrden, crearOrden, listarOrdenes, obtenerOrden } from './ordenes.api';
import type { EstadoOrden, FiltrosOrdenes, OrdenDetalle, OrdenNueva, OrdenResumen, PrioridadOrden } from './ordenes.types';
import { irA } from '../../shared/navigation';
import { useFiltrosListado } from '../../shared/useFiltrosListado';
import Modal from '../../shared/Modal';
import EditarOrdenForm from './EditarOrdenForm';
import DesactivarOrdenForm from './DesactivarOrdenForm';
import OrdenAcciones from './OrdenAcciones';
import { permiteAccionOrden, type AccionOrden } from './ordenes.acciones';

const filtrosIniciales: FiltrosOrdenes = { estado: '', buscar: '', pagina: 1, limite: 25 };
const estados: EstadoOrden[] = [
    'BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA', 'CANCELADA',
];
const siguientes: Partial<Record<EstadoOrden, EstadoOrden[]>> = {
    BORRADOR: ['PENDIENTE'],
    ASIGNADA: ['EN_EJECUCION'],
    EN_EJECUCION: ['EN_REVISION'],
    EN_REVISION: ['EN_EJECUCION', 'CERRADA'],
};
const indicacionesEstado: Record<EstadoOrden, string> = {
    BORRADOR: 'Publica la orden para poder asignar una cuadrilla.',
    PENDIENTE: 'Pendiente de asignar una cuadrilla.',
    ASIGNADA: 'La cuadrilla ya puede iniciar el trabajo.',
    EN_EJECUCION: 'Registra el trabajo y las evidencias antes de enviarla a revisión.',
    EN_REVISION: 'Revisa el trabajo y acepta las evidencias antes de cerrar la orden.',
    CERRADA: 'Trabajo finalizado. Puedes consultar lo realizado y su historial.',
    CANCELADA: 'Orden desactivada. Se conserva su información e historial.',
};
const nombreEstado = (estado: string) => estado.replaceAll('_', ' ');
const fecha = (valor: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(valor));
const nombreCliente = (ubicacion: Ubicacion) => ubicacion.cliente.organizacion?.razonSocial ??
    [ubicacion.cliente.persona?.firstName, ubicacion.cliente.persona?.firstLastName].filter(Boolean).join(' ');

interface Props { puedeGestionar?: boolean; ordenInicial?: number; crearInicial?: boolean }

export default function OrdenesManager({ puedeGestionar = true, ordenInicial, crearInicial = false }: Readonly<Props>) {
    const { filtros, aplicados, pendiente, cambiarFiltros, aplicarFiltros } = useFiltrosListado(filtrosIniciales);
    const [pagina, setPagina] = useState<{ items: OrdenResumen[]; hayMas: boolean }>({ items: [], hayMas: false });
    const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
    const [detalle, setDetalle] = useState<OrdenDetalle | null>(null);
    const [creando, setCreando] = useState(crearInicial);
    const [operacion, setOperacion] = useState<{ tipo: AccionOrden; orden: OrdenResumen } | null>(null);
    const consultaDetalle = useRef(0);
    const [clienteId, setClienteId] = useState('');
    const [ubicacionId, setUbicacionId] = useState('');
    const [solicitud, setSolicitud] = useState('');
    const [prioridad, setPrioridad] = useState<PrioridadOrden>('MEDIA');
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [motivo, setMotivo] = useState('');
    const [consultando, setCargando] = useState(true);
    const cargando = consultando || pendiente;
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

    useEffect(() => {
        if (!ordenInicial) return;
        let vigente = true;
        void obtenerOrden(ordenInicial).then(orden => { if (vigente) setDetalle(orden); })
            .catch(error => { if (vigente) setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo consultar la orden.' }); });
        return () => { vigente = false; };
    }, [ordenInicial]);

    // GET /api/equipos/ubicaciones ya devuelve únicamente ubicaciones activas
    // con clientes activos. La identidad del cliente deriva de cada ubicación.
    const clientesDisponibles = Array.from(
        new Map(ubicaciones.map(item => [item.cliente.id, item])).values(),
    ).sort((primero, segundo) => nombreCliente(primero).localeCompare(nombreCliente(segundo), 'es'));

    const ubicacionesCliente = ubicaciones.filter(item => String(item.cliente.id) === clienteId);

    function seleccionarCliente(id: string) {
        setClienteId(id);
        setUbicacionId('');
    }

    useEffect(() => {
        let vigente = true;
        void listarUbicaciones()
            .then(ubicacionesActivas => { if (vigente) setUbicaciones(ubicacionesActivas); })
            .catch((error: unknown) => {
                if (vigente) mostrarError(error, 'No se pudieron cargar las ubicaciones.');
            });
        return () => { vigente = false; };
    }, []);

    useEffect(() => {
        let vigente = true;
        void listarOrdenes(aplicados)
            .then(respuesta => { if (vigente) setPagina(respuesta); })
            .catch(error => { if (vigente) { setPagina({ items: [], hayMas: false }); mostrarError(error, 'No se pudo consultar el listado.'); } })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [aplicados]);

    function mostrarError(error: unknown, defecto: string) {
        setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : defecto });
    }

    function cargar(nuevosFiltros = aplicados) {
        setCargando(true);
        aplicarFiltros(nuevosFiltros);
    }

    function filtrar(nuevos: FiltrosOrdenes, esperar = false) {
        setMensaje(null); setCargando(true);
        cambiarFiltros({ ...nuevos, pagina: 1 }, esperar);
    }

    function limpiarFormulario() {
        setClienteId(''); setUbicacionId(''); setSolicitud(''); setPrioridad('MEDIA'); setFechaProgramada(''); setCreando(false);
        if (crearInicial) irA('/ordenes');
    }

    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar || guardando) return;
        if (!clienteId || !ubicacionesCliente.some(item => item.id === Number(ubicacionId))) {
            setMensaje({ tipo: 'error', texto: 'Selecciona un cliente y una de sus ubicaciones activas.' });
            return;
        }
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

    async function verDetalle(ordenSeleccionada: OrdenResumen) {
        const consulta = ++consultaDetalle.current;
        setMensaje(null);
        setDetalle(null);
        setOperacion({ tipo: 'ver', orden: ordenSeleccionada });
        try {
            const orden = await obtenerOrden(ordenSeleccionada.id);
            if (consulta !== consultaDetalle.current) return;
            setDetalle(orden);
            setMotivo('');
        } catch (error) {
            if (consulta === consultaDetalle.current) mostrarError(error, 'No se pudo consultar la orden.');
        }
    }

    function abrirAccion(orden: OrdenResumen, tipo: AccionOrden) {
        if (guardando || !permiteAccionOrden(orden.estadoCodigo, puedeGestionar, tipo)) return;
        if (tipo === 'ver') { void verDetalle(orden); return; }
        ++consultaDetalle.current;
        setMensaje(null); setDetalle(null); setOperacion({ tipo, orden });
    }

    function cerrarOperacion() {
        ++consultaDetalle.current;
        setOperacion(null); setDetalle(null); setMotivo(''); setGuardando(false);
        if (ordenInicial) irA('/ordenes');
    }

    function finalizarOperacion(texto: string) {
        cerrarOperacion(); setMensaje({ tipo: 'exito', texto }); cargar();
    }

    async function actualizarEstado(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        const boton = (event.nativeEvent as SubmitEvent).submitter;
        if (!detalle || guardando || !(boton instanceof HTMLButtonElement)) return;
        const nuevoEstado = boton.value as EstadoOrden;
        const opciones = siguientes[detalle.estadoCodigo] ?? [];
        if (!opciones.includes(nuevoEstado) || (!puedeGestionar && nuevoEstado !== 'EN_EJECUCION' && nuevoEstado !== 'EN_REVISION')) return;
        if (motivo.trim().length < 3) { setMensaje({ tipo: 'error', texto: 'Indica un motivo de al menos tres caracteres.' }); return; }
        setGuardando(true); setMensaje(null);
        try {
            const operacion = puedeGestionar ? cambiarEstadoOrden : ejecutarOrden;
            const actualizada = await operacion(detalle.id, nuevoEstado, motivo.trim());
            setDetalle(actualizada);
            setMotivo('');
            setMensaje({ tipo: 'exito', texto: 'Estado actualizado correctamente.' });
            await cargar();
        } catch (error) {
            mostrarError(error, 'No se pudo cambiar el estado.');
        } finally {
            setGuardando(false);
        }
    }

    function cambiarFiltroEstado(estado: EstadoOrden | '') {
        filtrar({ ...filtros, estado });
    }

    function contenidoDetalle() {
        if (!detalle) return null;
        const opciones = (siguientes[detalle.estadoCodigo] ?? []).filter(estado => puedeGestionar || estado === 'EN_EJECUCION' || estado === 'EN_REVISION');
        const asignacion = detalle.asignaciones?.[0];
        const etiquetaCambio = (estado: EstadoOrden) => estado === 'PENDIENTE' ? 'Publicar orden'
            : estado === 'EN_REVISION' ? 'Enviar a revisión' : estado === 'CERRADA' ? 'Cerrar orden'
                : detalle.estadoCodigo === 'EN_REVISION' ? 'Devolver a ejecución' : 'Iniciar trabajo';
        return (
            <section className="tk-order-overview" aria-label="Resumen de la orden">
                <div className="tk-order-state"><span className="tk-status-badge" data-status={detalle.estadoCodigo}>{nombreEstado(detalle.estadoCodigo)}</span><p>{indicacionesEstado[detalle.estadoCodigo]}</p></div>
                <dl className="tk-order-summary">
                    <div><dt>Cliente</dt><dd>{detalle.clienteNombreRegistrado}</dd></div>
                    <div><dt>Ubicación</dt><dd>{detalle.ubicacionNombreRegistrado}<span>{detalle.direccionRegistrada}</span></dd></div>
                    <div><dt>Cuadrilla responsable</dt><dd>{asignacion?.cuadrilla?.nombre ?? 'Sin asignar'}{asignacion?.empleadoResponsable && <span>{`${asignacion.empleadoResponsable.persona.firstName} ${asignacion.empleadoResponsable.persona.firstLastName}`}</span>}</dd></div>
                    <div><dt>Prioridad · Fecha programada</dt><dd>{detalle.prioridad}<span>{detalle.fechaProgramada ? fecha(detalle.fechaProgramada) : 'Sin programar'}</span></dd></div>
                </dl>
                <div className="tk-order-request"><h3>Solicitud</h3><p>{detalle.solicitud}</p></div>
                <details className="tk-order-section" open={!puedeGestionar && ['EN_EJECUCION', 'EN_REVISION'].includes(detalle.estadoCodigo)}><summary>Trabajo y evidencias</summary><EquiposOrdenPanel key={detalle.id} orden={detalle} puedeGestionar={puedeGestionar} /></details>
                <details className="tk-order-section"><summary>Historial de estados</summary>
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
                )}</details>
                {opciones.length > 0 && (
                        <form className="tk-order-next-step" onSubmit={event => void actualizarEstado(event)}>
                            <label>Motivo del cambio
                                <textarea aria-label="Motivo del cambio" value={motivo}
                                    onChange={event => setMotivo(event.target.value)} minLength={3}
                                    maxLength={1000} required rows={2} />
                            </label>
                            <div className="tk-form-actions">{opciones.map(estado => <button key={estado} type="submit" value={estado}
                                className={estado === 'EN_EJECUCION' && detalle.estadoCodigo === 'EN_REVISION' ? 'secondary-button' : 'primary-button'}
                                disabled={guardando}>{guardando ? 'Guardando…' : etiquetaCambio(estado)}</button>)}</div>
                        </form>
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
                            <th>Cliente / solicitud</th>
                            <th>Asignación</th>
                            <th>Programación</th>
                            <th>Estado</th>
                            <th>Acciones</th>
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
                                    <strong className="tk-cell-muted">{orden.asignaciones?.[0]?.cuadrilla?.nombre ?? 'Sin asignar'}</strong>
                                    <small>{orden.asignaciones?.[0]?.empleadoResponsable
                                        ? `${orden.asignaciones[0].empleadoResponsable.persona.firstName} ${orden.asignaciones[0].empleadoResponsable.persona.firstLastName}`
                                        : orden.ubicacionNombreRegistrado}</small>
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
                                <td data-label="Acciones">
                                    <OrdenAcciones orden={orden} puedeGestionar={puedeGestionar} onAction={tipo => abrirAccion(orden, tipo)} />
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
                    <div className="tk-form-fields">
                        <label>Cliente *
                            <select aria-label="Cliente" required value={clienteId}
                                onChange={event => seleccionarCliente(event.target.value)}>
                                <option value="">Selecciona un cliente</option>
                                {clientesDisponibles.map(item => (
                                    <option key={item.cliente.id} value={item.cliente.id}>
                                        {nombreCliente(item)} · {item.cliente.codigo}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Ubicación *
                            <select aria-label="Ubicación" required value={ubicacionId}
                                disabled={!clienteId}
                                onChange={event => setUbicacionId(event.target.value)}>
                                <option value="">{clienteId ? 'Selecciona una ubicación' : 'Selecciona primero un cliente'}</option>
                                {ubicacionesCliente.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre} · {item.direccion}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {clientesDisponibles.length === 0 && (
                            <p className="tk-wide form-hint" role="status">
                                No hay clientes con ubicaciones activas. Registra primero una ubicación para crear la orden.
                            </p>
                        )}
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
                        <button type="button" className="secondary-button" disabled={guardando} onClick={limpiarFormulario}>Cancelar</button>
                        <button type="submit" className="primary-button" disabled={guardando}>
                            {guardando ? 'Guardando…' : 'Registrar orden'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <section className="tk-orders" aria-labelledby="ordenes-titulo">
            <div className="tk-breadcrumb">Gestión operativa › <span>Órdenes</span></div>
            <div className="tk-orders-heading">
                <div>
                    <h2 id="ordenes-titulo">Órdenes de trabajo</h2>
                    <p>Consulta, edita o asigna una orden con los iconos de cada fila.</p>
                </div>
                <div className="tk-order-toolbar"><button type="button" className="secondary-button" aria-label="Actualizar órdenes" disabled={cargando} onClick={() => { setMensaje(null); cargar(); }}>Actualizar</button>
                {puedeGestionar && !creando && !detalle && !ordenInicial && (
                    <button type="button" className="primary-button tk-order-create"
                        onClick={() => { setMensaje(null); setDetalle(null); setOperacion(null); setCreando(true); }}>+ Nueva orden</button>
                )}</div>
            </div>
            {mensaje && !creando && !operacion && !detalle && !ordenInicial && <div className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</div>}
            {(
                <>
                    <form className="tk-filters" onSubmit={event => {
                        event.preventDefault(); setMensaje(null); cargar({ ...filtros, pagina: 1 });
                    }}>
                        <div className="tk-search-group">
                            <input aria-label="Buscar órdenes" placeholder="Buscar cliente o solicitud"
                                value={filtros.buscar}
                                maxLength={150} onChange={event => filtrar({ ...filtros, buscar: event.target.value }, true)} />
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
                            onChange={event => filtrar({ ...filtros, estado: event.target.value as EstadoOrden | '' })}>
                            <option value="">Todos los estados</option>
                            {estados.map(item => <option key={item} value={item}>{nombreEstado(item)}</option>)}
                        </select>
                        <button type="submit" className="secondary-button tk-search-submit">Buscar</button>
                        <button type="button" className="text-button" onClick={() => filtrar(filtrosIniciales)}>Limpiar</button>
                        <label>Prioridad<select aria-label="Filtrar prioridad" value={filtros.prioridad ?? ''} onChange={event => filtrar({ ...filtros, prioridad: event.target.value as PrioridadOrden | '' })}>
                            <option value="">Todas</option>{(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map(item => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
                        </select></label>
                        <label>Cliente<select aria-label="Filtrar cliente" value={filtros.clienteId ?? ''} onChange={event => filtrar({ ...filtros, clienteId: event.target.value })}>
                            <option value="">Todos</option>{clientesDisponibles.map(item => <option key={item.cliente.id} value={item.cliente.id}>{nombreCliente(item)}</option>)}
                        </select></label>
                        <label>Programada desde<input type="date" aria-label="Programada desde" value={filtros.desde ?? ''} max={filtros.hasta || undefined} onChange={event => filtrar({ ...filtros, desde: event.target.value })} /></label>
                        <label>Programada hasta<input type="date" aria-label="Programada hasta" value={filtros.hasta ?? ''} min={filtros.desde || undefined} onChange={event => filtrar({ ...filtros, hasta: event.target.value })} /></label>
                    </form>
                    <div className="card tk-table-card">
                        {contenidoLista()}
                        <div className="tk-table-pagination">
                            <button type="button" className="secondary-button" disabled={cargando || aplicados.pagina === 1}
                                onClick={() => cargar({ ...aplicados, pagina: aplicados.pagina - 1 })}>Anterior</button>
                            <span>Página {aplicados.pagina}</span>
                            <button type="button" className="secondary-button" disabled={cargando || !pagina.hayMas}
                                onClick={() => cargar({ ...aplicados, pagina: aplicados.pagina + 1 })}>Siguiente</button>
                        </div>
                    </div>
                </>
            )}
            {creando && puedeGestionar && <Modal titulo="Nueva orden de trabajo" descripcion="Elige cliente y ubicación, y describe el trabajo solicitado." ocupado={guardando} onClose={limpiarFormulario}>
                {mensaje && <p className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</p>}
                {formularioAlta()}
            </Modal>}
            {!creando && (operacion || detalle || ordenInicial) && <Modal
                titulo={operacion && operacion.tipo !== 'ver' ? `${({ editar: 'Editar', asignar: 'Asignar', desactivar: 'Desactivar' } as const)[operacion.tipo]} OT-${operacion.orden.numero}` : `Ver ${detalle ? `OT-${detalle.numero}` : 'orden'}`}
                descripcion={operacion?.tipo === 'editar' ? 'Cambia la solicitud, la prioridad o la fecha programada.'
                    : operacion?.tipo === 'asignar' ? 'Selecciona la cuadrilla que atenderá esta orden.'
                        : operacion?.tipo === 'desactivar' ? 'Cancela esta orden indicando un motivo.' : 'Resumen de la solicitud y su avance.'}
                ocupado={guardando} onClose={cerrarOperacion}>
                {mensaje && <p className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</p>}
                {operacion?.tipo === 'editar' && <EditarOrdenForm orden={operacion.orden} onBusy={setGuardando} onCancel={cerrarOperacion} onSaved={() => finalizarOperacion('Orden actualizada correctamente.')} />}
                {operacion?.tipo === 'desactivar' && <DesactivarOrdenForm orden={operacion.orden} onBusy={setGuardando} onCancel={cerrarOperacion} onSaved={() => finalizarOperacion('Orden desactivada. Su estado es CANCELADA.')} />}
                {operacion?.tipo === 'asignar' && <AsignarOrdenPanel orden={operacion.orden} onBusy={setGuardando} compacto onCancel={cerrarOperacion} onAssigned={() => finalizarOperacion('Orden asignada correctamente.')} />}
                {(!operacion || operacion.tipo === 'ver') && <>{detalle ? contenidoDetalle() : <p>{mensaje?.tipo === 'error' ? 'No se pudo abrir esta orden.' : 'Cargando orden…'}</p>}</>}
            </Modal>}
        </section>
    );
}
