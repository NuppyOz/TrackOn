import { useEffect, useState, type FormEvent } from 'react'
import { cambiarEstadoServicio, crearServicio, editarServicio, listarServicios } from './servicios.api'
import type { EstadoServicio, Servicio, ServicioInput } from './servicios.types'

const vacio = { codigo: '', nombre: '', descripcion: '' }

export default function ServiciosManager() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [formulario, setFormulario] = useState(vacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [estado, setEstado] = useState<EstadoServicio>('todos')
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null)

  async function cargar(nuevoEstado = estado, nuevaBusqueda = buscar) {
    setCargando(true)
    try { setServicios(await listarServicios(nuevoEstado, nuevaBusqueda)) }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.' }) }
    finally { setCargando(false) }
  }
  useEffect(() => {
    listarServicios('todos', '')
      .then(setServicios)
      .catch((error) => setMensaje({
        tipo: 'error',
        texto: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.',
      }))
      .finally(() => setCargando(false))
  }, [])

  function cancelar() { setFormulario(vacio); setEditando(null) }
  function editar(servicio: Servicio) { setEditando(servicio.id); setFormulario({ codigo: servicio.codigo, nombre: servicio.nombre, descripcion: servicio.descripcion ?? '' }); setMensaje(null) }
  async function guardar(event: FormEvent) {
    event.preventDefault(); setGuardando(true); setMensaje(null)
    const datos: ServicioInput = { ...formulario, descripcion: formulario.descripcion || null }
    try {
      if (editando) await editarServicio(editando, datos); else await crearServicio(datos)
      setMensaje({ tipo: 'exito', texto: editando ? 'Servicio actualizado.' : 'Servicio creado.' }); cancelar(); await cargar()
    } catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo guardar el servicio.' }) }
    finally { setGuardando(false) }
  }
  async function cambiarEstado(servicio: Servicio) {
    setMensaje(null)
    try { await cambiarEstadoServicio(servicio.id, !servicio.activo); setMensaje({ tipo: 'exito', texto: `Servicio ${servicio.activo ? 'desactivado' : 'reactivado'}.` }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar el estado.' }) }
  }

  return <section aria-labelledby="servicios-titulo">
    <div className="section-heading"><div><p className="eyebrow">Configuración</p><h2 id="servicios-titulo">Catálogo de servicios</h2><p>Define los trabajos disponibles para las órdenes de servicio.</p></div><span className="count-pill">{servicios.length} servicios</span></div>
    {mensaje && <div className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</div>}
    <div className="panel-grid">
      <form className="card form-card" onSubmit={guardar}>
        <div className="card-title"><h3>{editando ? 'Editar servicio' : 'Nuevo servicio'}</h3>{editando && <button type="button" className="text-button" onClick={cancelar}>Cancelar</button>}</div>
        <label>Código<input required maxLength={30} value={formulario.codigo} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label>
        <label>Nombre<input required maxLength={150} value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} /></label>
        <label>Descripción<textarea rows={4} value={formulario.descripcion} onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })} /></label>
        <button className="primary-button" disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear servicio'}</button>
      </form>
      <div className="card list-card">
        <form className="filters service-filters" onSubmit={(e) => { e.preventDefault(); setMensaje(null); void cargar() }}>
          <input aria-label="Buscar servicio" placeholder="Buscar por código o nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoServicio)}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select>
          <button className="secondary-button">Buscar</button>
        </form>
        {cargando ? <p className="empty">Cargando servicios…</p> : servicios.length === 0 ? <p className="empty">No hay servicios que coincidan.</p> : <div className="service-list">{servicios.map((servicio) => <article key={servicio.id} className="service-item"><div><div className="service-title"><strong>{servicio.nombre}</strong><code>{servicio.codigo}</code><span className={`status ${servicio.activo ? 'active' : 'inactive'}`}>{servicio.activo ? 'Activo' : 'Inactivo'}</span></div><p>{servicio.descripcion ?? 'Sin descripción'}</p>{!servicio.activo && <small>Disponible para consulta histórica; no se mostrará en nuevas selecciones.</small>}</div><div className="actions"><button onClick={() => editar(servicio)}>Editar</button><button onClick={() => void cambiarEstado(servicio)}>{servicio.activo ? 'Desactivar' : 'Activar'}</button></div></article>)}</div>}
      </div>
    </div>
  </section>
}
