import { useEffect, useState, type SyntheticEvent } from 'react';
import { cambiarEstadoMaterial, crearMaterial, editarMaterial, listarMateriales, type EstadoMaterial, type Material, type MaterialInput } from './materiales.api';
import { Button, StatePanel, StatusBadge } from '../../shared/ui';
import { useFiltrosListado } from '../../shared/useFiltrosListado';

const vacio: MaterialInput = { codigo: '', nombre: '', unidadMedida: '' };
const filtrosIniciales = { estado: 'activos' as EstadoMaterial, buscar: '', pagina: 1 };

export default function MaterialesManager({ puedeGestionar }: Readonly<{ puedeGestionar: boolean }>) {
    const { filtros, aplicados, pendiente, cambiarFiltros, aplicarFiltros } = useFiltrosListado(filtrosIniciales);
    const [datos, setDatos] = useState<{ items: Material[]; hayMas: boolean }>({ items: [], hayMas: false });
    const [consultando, setCargando] = useState(true);
    const cargando = consultando || pendiente;
    const [recarga, setRecarga] = useState(0);
    const [formulario, setFormulario] = useState<MaterialInput | null>(null);
    const [editando, setEditando] = useState<number | null>(null);
    const [confirmacion, setConfirmacion] = useState<Material | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);

    useEffect(() => {
        let vigente = true;
        void listarMateriales(aplicados.estado, aplicados.buscar, aplicados.pagina)
            .then(resultado => { if (vigente) setDatos(resultado); })
            .catch(error => { if (vigente) { setDatos({ items: [], hayMas: false }); setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No se pudieron cargar los materiales.' }); } })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [aplicados, recarga]);

    function buscar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault(); setMensaje(null); setCargando(true);
        aplicarFiltros({ ...filtros, pagina: 1 });
    }
    function filtrar(nuevos: typeof filtrosIniciales, esperar = false) {
        setMensaje(null); setCargando(true);
        cambiarFiltros({ ...nuevos, pagina: 1 }, esperar);
    }
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!formulario || guardando || !puedeGestionar) return;
        setGuardando(true); setMensaje(null);
        try {
            if (editando) await editarMaterial(editando, formulario); else await crearMaterial(formulario);
            setFormulario(null); setEditando(null); setRecarga(valor => valor + 1);
            setMensaje({ error: false, texto: 'Material guardado correctamente.' });
        } catch (error) { setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No se pudo guardar el material.' }); }
        finally { setGuardando(false); }
    }
    async function cambiarEstado() {
        if (!confirmacion || guardando || !puedeGestionar) return;
        setGuardando(true); setMensaje(null);
        try {
            await cambiarEstadoMaterial(confirmacion.id, !confirmacion.activo);
            setConfirmacion(null); setRecarga(valor => valor + 1);
            setMensaje({ error: false, texto: 'Estado del material actualizado.' });
        } catch (error) { setMensaje({ error: true, texto: error instanceof Error ? error.message : 'No se pudo actualizar el estado.' }); }
        finally { setGuardando(false); }
    }
    return <section aria-labelledby="materiales-titulo">
        <div className="section-heading"><div><h2 id="materiales-titulo">{formulario ? (editando ? 'Editar material' : 'Registrar material') : 'Materiales'}</h2>
            <p>Administra los insumos y sus unidades para registrar el consumo en cada intervención.</p></div>
            {puedeGestionar && !formulario && <Button variant="primary" onClick={() => { setEditando(null); setFormulario({ ...vacio }); setMensaje(null); }}>+ Registrar material</Button>}
        </div>
        {mensaje && <div className={`notice ${mensaje.error ? 'error' : 'exito'}`} role={mensaje.error ? 'alert' : 'status'}>{mensaje.texto}</div>}
        {formulario ? <form className="card form-card" onSubmit={event => void guardar(event)}>
            <h3>Datos del material</h3>
            <label>Código *<input required maxLength={30} value={formulario.codigo} onChange={event => setFormulario({ ...formulario, codigo: event.target.value })} /></label>
            <label>Nombre *<input required maxLength={150} value={formulario.nombre} onChange={event => setFormulario({ ...formulario, nombre: event.target.value })} /></label>
            <label>Unidad de medida *<input required maxLength={30} placeholder="Ej. unidad, metro, kilogramo" value={formulario.unidadMedida} onChange={event => setFormulario({ ...formulario, unidadMedida: event.target.value })} /></label>
            <div className="tk-form-actions"><Button disabled={guardando} type="button" onClick={() => setFormulario(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" loading={guardando}>Guardar material</Button></div>
        </form> : <div className="card list-card">
            <form className="filters" onSubmit={buscar}>
                <input aria-label="Buscar material" placeholder="Buscar por código o nombre" value={filtros.buscar} maxLength={150} onChange={event => filtrar({ ...filtros, buscar: event.target.value }, true)} />
                <select aria-label="Estado del material" value={filtros.estado} onChange={event => filtrar({ ...filtros, estado: event.target.value as EstadoMaterial })}>
                    <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
                </select><Button type="submit">Buscar</Button><Button type="button" onClick={() => filtrar(filtrosIniciales)}>Limpiar</Button>
            </form>
            {cargando ? <StatePanel type="loading" title="Cargando materiales…" /> : datos.items.length === 0 ? <StatePanel type="empty" title="No hay materiales para estos filtros" /> :
                <div className="table-wrap"><table><thead><tr><th>Material</th><th>Unidad de medida</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
                    {datos.items.map(material => <tr key={material.id}>
                        <td data-label="Material"><strong>{material.nombre}</strong><small>{material.codigo}</small></td><td data-label="Unidad">{material.unidadMedida}</td>
                        <td data-label="Estado"><StatusBadge active={material.activo} /></td><td data-label="Acciones" className="actions">{puedeGestionar && <>
                            <Button onClick={() => { setEditando(material.id); setFormulario({ codigo: material.codigo, nombre: material.nombre, unidadMedida: material.unidadMedida }); }}>Editar</Button>
                            <Button onClick={() => setConfirmacion(material)}>{material.activo ? 'Desactivar' : 'Activar'}</Button>
                        </>}</td></tr>)}
                </tbody></table></div>}
            <div className="pagination"><Button disabled={cargando || aplicados.pagina === 1} onClick={() => { setCargando(true); aplicarFiltros({ ...aplicados, pagina: aplicados.pagina - 1 }); }}>Anterior</Button>
                <span>Página {aplicados.pagina}</span><Button disabled={cargando || !datos.hayMas} onClick={() => { setCargando(true); aplicarFiltros({ ...aplicados, pagina: aplicados.pagina + 1 }); }}>Siguiente</Button></div>
        </div>}
        {confirmacion && <div className="card form-card" role="dialog" aria-modal="false" aria-labelledby="material-confirmar">
            <h3 id="material-confirmar">{confirmacion.activo ? 'Desactivar' : 'Activar'} {confirmacion.nombre}</h3>
            <p>Los consumos anteriores conservarán sus datos históricos.</p><Button disabled={guardando} onClick={() => setConfirmacion(null)}>Cancelar</Button>
            <Button variant="primary" loading={guardando} onClick={() => void cambiarEstado()}>Confirmar</Button>
        </div>}
    </section>;
}
