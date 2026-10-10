import { useEffect, useState, type FormEvent } from "react";
import {
    cambiarEstadoCliente, cambiarEstadoUbicacion, crearCliente, crearUbicacion,
    listarClientes, listarUbicacionesCliente,
} from "./clientes.api";
import { nombreCliente, type Cliente, type ClienteNuevo, type TipoCliente,
    type TipoDocumento, type UbicacionCliente, type UbicacionNueva } from "./clientes.types";

interface Props { puedeGestionar: boolean }
type Vista = "listado" | "crear" | "detalle";

interface FormCliente {
    tipo: TipoCliente; codigo: string; primerNombre: string; segundoNombre: string;
    primerApellido: string; segundoApellido: string; tipoDocumento: TipoDocumento;
    numeroDocumento: string; razonSocial: string; nombreComercial: string;
    ruc: string; telefono: string; correo: string;
}

const formularioVacio: FormCliente = {
    tipo: "NATURAL", codigo: "", primerNombre: "", segundoNombre: "",
    primerApellido: "", segundoApellido: "", tipoDocumento: "CEDULA_NIC",
    numeroDocumento: "", razonSocial: "", nombreComercial: "", ruc: "",
    telefono: "", correo: "",
};
const ubicacionVacia = {
    nombre: "", direccion: "", referencia: "", contactoNombre: "", contactoTelefono: "",
};

type FormUbicacion = typeof ubicacionVacia;

function datosCliente(formulario: FormCliente): ClienteNuevo {
    const comunes = {
        codigo: formulario.codigo.trim().toUpperCase(),
        ...(formulario.telefono.trim() && { telefonoComercial: formulario.telefono.trim() }),
        ...(formulario.correo.trim() && { correoComercial: formulario.correo.trim() }),
    };
    if (formulario.tipo === "EMPRESA") {
        return {
            ...comunes, tipo: "EMPRESA",
            organizacion: {
                razonSocial: formulario.razonSocial.trim(),
                identificacionTributaria: formulario.ruc.trim().toUpperCase(),
                ...(formulario.nombreComercial.trim() && {
                    nombreComercial: formulario.nombreComercial.trim(),
                }),
            },
        };
    }
    return {
        ...comunes, tipo: "NATURAL",
        persona: {
            firstName: formulario.primerNombre.trim(),
            firstLastName: formulario.primerApellido.trim(),
            typeDocument: formulario.tipoDocumento,
            numberDocument: formulario.numeroDocumento.trim(),
            ...(formulario.segundoNombre.trim() && { secondName: formulario.segundoNombre.trim() }),
            ...(formulario.segundoApellido.trim() && { secondLastName: formulario.segundoApellido.trim() }),
            ...(formulario.telefono.trim() && { telephone: formulario.telefono.trim() }),
            ...(formulario.correo.trim() && { correo: formulario.correo.trim() }),
        },
    };
}

function datosUbicacion(clienteId: number, formulario: FormUbicacion): UbicacionNueva {
    return {
        clienteId, nombre: formulario.nombre.trim(), direccion: formulario.direccion.trim(),
        ...(formulario.referencia.trim() && { referencia: formulario.referencia.trim() }),
        ...(formulario.contactoNombre.trim() && { contactoNombre: formulario.contactoNombre.trim() }),
        ...(formulario.contactoTelefono.trim() && { contactoTelefono: formulario.contactoTelefono.trim() }),
    };
}

function etiquetaTipo(cliente: Cliente) {
    return cliente.organizacion ? "Persona jurídica" : "Persona natural";
}

export default function ClientesManager({ puedeGestionar }: Readonly<Props>) {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [vista, setVista] = useState<Vista>("listado");
    const [clienteId, setClienteId] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);
    const [formulario, setFormulario] = useState<FormCliente>(formularioVacio);
    const [ubicaciones, setUbicaciones] = useState<UbicacionCliente[]>([]);
    const [pagina, setPagina] = useState(1);
    const [hayMas, setHayMas] = useState(false);
    const [versionUbicaciones, setVersionUbicaciones] = useState(0);
    const [cargandoUbicaciones, setCargandoUbicaciones] = useState(false);
    const [errorUbicaciones, setErrorUbicaciones] = useState<string | null>(null);
    const [registrandoUbicacion, setRegistrandoUbicacion] = useState(false);
    const [formUbicacion, setFormUbicacion] = useState<FormUbicacion>(ubicacionVacia);

    useEffect(() => {
        let vigente = true;
        void listarClientes().then(items => {
            if (vigente) setClientes(items);
        }).catch((e: unknown) => {
            if (vigente) setError((e as Error).message);
        }).finally(() => {
            if (vigente) setCargando(false);
        });
        return () => { vigente = false; };
    }, []);

    useEffect(() => {
        if (vista !== "detalle" || clienteId === null) return;
        let vigente = true;
        void listarUbicacionesCliente(clienteId, pagina).then(resultado => {
            if (!vigente) return;
            setUbicaciones(resultado.items);
            setHayMas(resultado.hayMas);
        }).catch((e: unknown) => {
            if (vigente) setErrorUbicaciones((e as Error).message);
        }).finally(() => {
            if (vigente) setCargandoUbicaciones(false);
        });
        return () => { vigente = false; };
    }, [vista, clienteId, pagina, versionUbicaciones]);

    const seleccionado = clientes.find(cliente => cliente.id === clienteId);
    const filtrados = clientes.filter(cliente => {
        if (filtroEstado === "activos" && !cliente.activo) return false;
        if (filtroEstado === "inactivos" && cliente.activo) return false;
        if (filtroTipo === "NATURAL" && !cliente.persona) return false;
        if (filtroTipo === "EMPRESA" && !cliente.organizacion) return false;
        const texto = [cliente.codigo, nombreCliente(cliente),
            cliente.persona?.numberDocument, cliente.organizacion?.identificacionTributaria]
            .join(" ").toLocaleLowerCase("es");
        return texto.includes(busqueda.toLocaleLowerCase("es").trim());
    });

    function volver() {
        setVista("listado"); setError(null); setMensaje(null);
        setRegistrandoUbicacion(false); setFormUbicacion(ubicacionVacia);
    }

    function abrirCliente(id: number) {
        setClienteId(id); setPagina(1); setVista("detalle");
        setError(null); setMensaje(null); setRegistrandoUbicacion(false);
        setCargandoUbicaciones(true); setErrorUbicaciones(null);
    }

    function actualizarFormulario<K extends keyof FormCliente>(clave: K, valor: FormCliente[K]) {
        setFormulario(actual => ({ ...actual, [clave]: valor }));
    }

    async function guardarCliente(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar || guardando) return;
        setGuardando(true); setError(null); setMensaje(null);
        try {
            const creado = await crearCliente(datosCliente(formulario));
            setClientes(actual => [...actual, creado]);
            setFormulario(formularioVacio);
            abrirCliente(creado.id);
            setMensaje("Cliente registrado correctamente. Ahora registra su ubicación.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setGuardando(false);
        }
    }

    async function guardarUbicacion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeGestionar || guardando || !seleccionado?.activo) return;
        setGuardando(true); setError(null); setMensaje(null);
        try {
            await crearUbicacion(datosUbicacion(seleccionado.id, formUbicacion));
            setRegistrandoUbicacion(false); setFormUbicacion(ubicacionVacia);
            setPagina(1); setCargandoUbicaciones(true);
            setVersionUbicaciones(v => v + 1);
            setMensaje("Ubicación registrada correctamente.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setGuardando(false);
        }
    }

    async function alternarCliente(cliente: Cliente) {
        if (!puedeGestionar || guardando) return;
        setGuardando(true); setError(null); setMensaje(null);
        try {
            const actualizado = await cambiarEstadoCliente(cliente.id, !cliente.activo);
            setClientes(actual => actual.map(c => c.id === cliente.id ? actualizado : c));
            setMensaje(actualizado.activo ? "Cliente activado." : "Cliente desactivado.");
        } catch (e) {
            setError((e as Error).message);
        } finally { setGuardando(false); }
    }

    async function alternarUbicacion(ubicacion: UbicacionCliente) {
        if (!puedeGestionar || guardando) return;
        setGuardando(true); setError(null); setMensaje(null);
        try {
            await cambiarEstadoUbicacion(ubicacion.id, !ubicacion.activa);
            setCargandoUbicaciones(true); setVersionUbicaciones(v => v + 1);
            setMensaje(ubicacion.activa ? "Ubicación desactivada." : "Ubicación activada.");
        } catch (e) { setError((e as Error).message); }
        finally { setGuardando(false); }
    }

    return (
        <section className="tk-clientes" aria-labelledby="tk-clientes-title">
            <div className="tk-clientes-breadcrumb">Gestión comercial › <strong>Clientes</strong></div>
            <div className="section-heading tk-clientes-heading">
                <div>
                    <h2 id="tk-clientes-title">{vista === "crear" ? "Registrar cliente" :
                        vista === "detalle" ? nombreCliente(seleccionado ?? {
                            id: 0, codigo: "Cliente", activo: true, telefonoComercial: null,
                            correoComercial: null, persona: null, organizacion: null,
                        }) : "Clientes"}</h2>
                    <p>{vista === "crear" ? "Registra una persona o empresa atendida por MULTICAS." :
                        vista === "detalle" ? "Información y ubicaciones del cliente." :
                            "Administra las personas y empresas atendidas por MULTICAS."}</p>
                </div>
                {vista === "listado" && puedeGestionar && <button className="primary-button" type="button"
                    onClick={() => { setFormulario(formularioVacio); setError(null); setMensaje(null); setVista("crear"); }}>
                    + Registrar cliente
                </button>}
                {vista !== "listado" && <button className="secondary-button" type="button" onClick={volver}>← Clientes</button>}
            </div>
            {error && <p className="notice error" role="alert">{error}</p>}
            {mensaje && <output className="notice exito">{mensaje}</output>}

            {vista === "listado" && <>
                <div className="card tk-clientes-filtros">
                    <label>Buscar
                        <input aria-label="Buscar cliente" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                            placeholder="Código, nombre o identificación" />
                    </label>
                    <label>Tipo de cliente
                        <select aria-label="Filtrar tipo de cliente" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                            <option value="todos">Todos</option><option value="NATURAL">Persona natural</option>
                            <option value="EMPRESA">Persona jurídica</option>
                        </select>
                    </label>
                    <label>Estado
                        <select aria-label="Filtrar estado de cliente" value={filtroEstado}
                            onChange={e => setFiltroEstado(e.target.value)}>
                            <option value="todos">Todos</option><option value="activos">Activos</option>
                            <option value="inactivos">Inactivos</option>
                        </select>
                    </label>
                </div>
                <div className="card list-card">
                    {cargando ? <p className="empty">Cargando clientes…</p> : filtrados.length === 0 ?
                        <p className="empty">No hay clientes que coincidan con los filtros.</p> :
                        <div className="table-wrap"><table className="tk-clientes-tabla">
                            <thead><tr><th>Código</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Acción</th></tr></thead>
                            <tbody>{filtrados.map(cliente => <tr key={cliente.id}>
                                <td data-label="Código"><strong>{cliente.codigo}</strong></td>
                                <td data-label="Cliente"><strong>{nombreCliente(cliente)}</strong>
                                    <span>{cliente.correoComercial || cliente.telefonoComercial || "Sin contacto comercial"}</span></td>
                                <td data-label="Tipo">{etiquetaTipo(cliente)}</td>
                                <td data-label="Estado"><span className={`status ${cliente.activo ? "active" : "inactive"}`}>
                                    {cliente.activo ? "Activo" : "Inactivo"}</span></td>
                                <td data-label="Acción"><button type="button" className="secondary-button"
                                    onClick={() => abrirCliente(cliente.id)}>Ver detalle</button></td>
                            </tr>)}</tbody>
                        </table></div>}
                </div>
            </>}

            {vista === "crear" && puedeGestionar && <form className="card form-card tk-clientes-form" onSubmit={e => void guardarCliente(e)}>
                <p className="tk-clientes-section-title">DATOS DEL CLIENTE</p>
                <label>Tipo de cliente *
                    <select aria-label="Tipo de cliente" value={formulario.tipo}
                        onChange={e => actualizarFormulario("tipo", e.target.value as TipoCliente)}>
                        <option value="NATURAL">Persona natural</option><option value="EMPRESA">Persona jurídica</option>
                    </select>
                </label>
                <label>Código del cliente *
                    <input required maxLength={30} value={formulario.codigo} placeholder="Ej. CLI-001"
                        onChange={e => actualizarFormulario("codigo", e.target.value)} />
                </label>
                {formulario.tipo === "NATURAL" ? <>
                    <p className="tk-clientes-section-title">INFORMACIÓN PERSONAL</p>
                    <div className="two-columns">
                        <label>Primer nombre *<input required maxLength={100} value={formulario.primerNombre}
                            onChange={e => actualizarFormulario("primerNombre", e.target.value)} /></label>
                        <label>Segundo nombre<input maxLength={100} value={formulario.segundoNombre}
                            onChange={e => actualizarFormulario("segundoNombre", e.target.value)} /></label>
                        <label>Primer apellido *<input required maxLength={100} value={formulario.primerApellido}
                            onChange={e => actualizarFormulario("primerApellido", e.target.value)} /></label>
                        <label>Segundo apellido<input maxLength={100} value={formulario.segundoApellido}
                            onChange={e => actualizarFormulario("segundoApellido", e.target.value)} /></label>
                        <label>Tipo de documento *
                            <select value={formulario.tipoDocumento}
                                onChange={e => actualizarFormulario("tipoDocumento", e.target.value as TipoDocumento)}>
                                <option value="CEDULA_NIC">Cédula nicaragüense</option>
                                <option value="CEDULA_RESIDENCIA">Cédula de residencia</option>
                                <option value="PASAPORTE">Pasaporte</option>
                            </select>
                        </label>
                        <label>Número de documento *<input required maxLength={50}
                            placeholder={formulario.tipoDocumento === "CEDULA_NIC" ? "13 cifras y una letra" : "Número de documento"}
                            value={formulario.numeroDocumento}
                            onChange={e => actualizarFormulario("numeroDocumento", e.target.value)} /></label>
                    </div>
                </> : <>
                    <p className="tk-clientes-section-title">INFORMACIÓN DE LA EMPRESA</p>
                    <label>Razón social *<input required maxLength={200} value={formulario.razonSocial}
                        onChange={e => actualizarFormulario("razonSocial", e.target.value)} /></label>
                    <div className="two-columns">
                        <label>Nombre comercial<input maxLength={200} value={formulario.nombreComercial}
                            onChange={e => actualizarFormulario("nombreComercial", e.target.value)} /></label>
                        <label>RUC *<input required maxLength={14} pattern="J[0-9]{13}"
                            title="Letra J seguida de 13 dígitos" value={formulario.ruc}
                            onChange={e => actualizarFormulario("ruc", e.target.value.toUpperCase())} /></label>
                    </div>
                </>}
                <p className="tk-clientes-section-title">DATOS DE CONTACTO</p>
                <div className="two-columns">
                    <label>Teléfono<input maxLength={25} value={formulario.telefono}
                        onChange={e => actualizarFormulario("telefono", e.target.value)} /></label>
                    <label>Correo electrónico<input type="email" maxLength={254} value={formulario.correo}
                        onChange={e => actualizarFormulario("correo", e.target.value)} /></label>
                </div>
                <div className="tk-clientes-actions"><button className="secondary-button" type="button" onClick={volver}>Cancelar</button>
                    <button className="primary-button" type="submit" disabled={guardando}>
                        {guardando ? "Guardando…" : "Registrar cliente"}</button></div>
            </form>}

            {vista === "detalle" && seleccionado && <>
                <div className="tk-clientes-detalle-estado card">
                    <div><strong>{seleccionado.codigo}</strong><p>{etiquetaTipo(seleccionado)}</p>
                        <span className={`status ${seleccionado.activo ? "active" : "inactive"}`}>
                            {seleccionado.activo ? "Activo" : "Inactivo"}</span></div>
                    {puedeGestionar && <button className="secondary-button" type="button" disabled={guardando}
                        onClick={() => void alternarCliente(seleccionado)}>
                        {seleccionado.activo ? "Desactivar cliente" : "Activar cliente"}</button>}
                </div>
                <div className="card tk-clientes-ubicaciones">
                    <div className="tk-clientes-ubicaciones-heading">
                        <div><h3>Ubicaciones</h3><p>Instalaciones del cliente donde MULTICAS realiza trabajos.</p></div>
                        {puedeGestionar && seleccionado.activo && !registrandoUbicacion &&
                            <button type="button" className="primary-button" onClick={() => {
                                setRegistrandoUbicacion(true); setError(null);
                            }}>+ Registrar ubicación</button>}
                    </div>
                    {registrandoUbicacion && <form className="tk-clientes-ubicacion-form form-card" onSubmit={e => void guardarUbicacion(e)}>
                        <div className="card-title"><h3>Nueva ubicación</h3>
                            <button type="button" className="text-button" onClick={() => setRegistrandoUbicacion(false)}>Cancelar</button></div>
                        <label>Nombre de ubicación *<input required maxLength={150} value={formUbicacion.nombre}
                            placeholder="Ej. Sucursal principal" onChange={e => setFormUbicacion(f => ({ ...f, nombre: e.target.value }))} /></label>
                        <label>Dirección *<textarea required maxLength={2000} rows={3} value={formUbicacion.direccion}
                            onChange={e => setFormUbicacion(f => ({ ...f, direccion: e.target.value }))} /></label>
                        <div className="two-columns">
                            <label>Nombre del contacto<input maxLength={200} value={formUbicacion.contactoNombre}
                                onChange={e => setFormUbicacion(f => ({ ...f, contactoNombre: e.target.value }))} /></label>
                            <label>Teléfono del contacto<input maxLength={25} value={formUbicacion.contactoTelefono}
                                onChange={e => setFormUbicacion(f => ({ ...f, contactoTelefono: e.target.value }))} /></label>
                        </div>
                        <label>Referencia<textarea maxLength={2000} rows={2} value={formUbicacion.referencia}
                            onChange={e => setFormUbicacion(f => ({ ...f, referencia: e.target.value }))} /></label>
                        <button type="submit" className="primary-button" disabled={guardando}>
                            {guardando ? "Guardando…" : "Guardar ubicación"}</button>
                    </form>}
                    {errorUbicaciones && <p role="alert" className="notice error">{errorUbicaciones}</p>}
                    {cargandoUbicaciones ? <p className="empty">Cargando ubicaciones…</p> : ubicaciones.length === 0 ?
                        <p className="empty">Este cliente todavía no tiene ubicaciones registradas.</p> :
                        <div className="tk-clientes-ubicaciones-list">
                            {ubicaciones.map(ubicacion => <article key={ubicacion.id} className="tk-clientes-ubicacion-item">
                                <div><strong>{ubicacion.nombre}</strong><p>{ubicacion.direccion}</p>
                                    <small>{ubicacion._count?.equipos ?? 0} equipos registrados</small></div>
                                <div className="tk-clientes-item-actions"><span className={`status ${ubicacion.activa ? "active" : "inactive"}`}>
                                    {ubicacion.activa ? "Activa" : "Inactiva"}</span>
                                    {puedeGestionar && <button className="secondary-button" disabled={guardando}
                                        type="button" onClick={() => void alternarUbicacion(ubicacion)}>
                                        {ubicacion.activa ? "Desactivar" : "Activar"}</button>}</div>
                            </article>)}
                        </div>}
                    <div className="tk-clientes-pagination">
                        <button className="secondary-button" type="button" disabled={pagina <= 1 || cargandoUbicaciones}
                            onClick={() => { setCargandoUbicaciones(true); setPagina(p => Math.max(1, p - 1)); }}>Anterior</button>
                        <span>Página {pagina}</span>
                        <button className="secondary-button" type="button" disabled={!hayMas || cargandoUbicaciones}
                            onClick={() => { setCargandoUbicaciones(true); setPagina(p => p + 1); }}>Siguiente</button>
                    </div>
                </div>
            </>}
        </section>
    );
}
