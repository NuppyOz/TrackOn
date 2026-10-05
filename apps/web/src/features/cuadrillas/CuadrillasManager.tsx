import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { agregarMiembro, cambiarEstadoCuadrilla, crearCuadrilla, definirLider, editarCuadrilla, listarCuadrillas, listarEmpleadosElegibles, retirarMiembro } from './cuadrillas.api'
import type { Cuadrilla, CuadrillaFiltros, EmpleadoCuadrilla } from './cuadrillas.types'

const filtrosIniciales: CuadrillaFiltros = { estado: 'activas', nombre: '' }
const nombreEmpleado = (empleado: EmpleadoCuadrilla) => `${empleado.persona.firstName} ${empleado.persona.firstLastName}`
const fecha = (valor: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(valor))

export default function CuadrillasManager() {
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([])
  const [empleados, setEmpleados] = useState<EmpleadoCuadrilla[]>([])
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const [empleadoId, setEmpleadoId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null)
  const [formularioVisible, setFormularioVisible] = useState(false)

  const cuadrilla = useMemo(() => cuadrillas.find((item) => item.id === seleccionada) ?? null, [cuadrillas, seleccionada])
  const miembrosVigentes = cuadrilla?.miembros.filter((miembro) => !miembro.fin) ?? []
  const historial = cuadrilla?.miembros.filter((miembro) => miembro.fin) ?? []
  const empleadosDisponibles = empleados.filter((empleado) => !miembrosVigentes.some((miembro) => miembro.empleadoId === empleado.id))

  async function cargar(nuevosFiltros = filtros) {
    setCargando(true)
    try {
      const respuesta = await listarCuadrillas(nuevosFiltros)
      const lista = respuesta.items
      setCuadrillas(lista)
      setSeleccionada((actual) => lista.some((item) => item.id === actual) ? actual : lista[0]?.id ?? null)
    } catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron cargar las cuadrillas.' }) }
    finally { setCargando(false) }
  }

  useEffect(() => {
    Promise.all([listarCuadrillas(filtrosIniciales), listarEmpleadosElegibles()])
      .then(([respuesta, empleadosActivos]) => { const lista = respuesta.items; setCuadrillas(lista); setEmpleados(empleadosActivos); setSeleccionada(lista[0]?.id ?? null) })
      .catch((error) => setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron cargar los datos.' }))
      .finally(() => setCargando(false))
  }, [])

  function cancelarEdicion() { setEditando(null); setNombre(''); setFormularioVisible(false) }
  async function guardar(event: FormEvent) {
    event.preventDefault(); setGuardando(true); setMensaje(null)
    if (!nombre.trim()) { setMensaje({ tipo: 'error', texto: 'El nombre de la cuadrilla es obligatorio.' }); setGuardando(false); return }
    try {
      const resultado = editando ? await editarCuadrilla(editando, { nombre }) : await crearCuadrilla({ nombre })
      setMensaje({ tipo: 'exito', texto: editando ? 'Cuadrilla actualizada.' : 'Cuadrilla creada. Agrega sus integrantes para conformarla.' })
      cancelarEdicion(); await cargar(); setSeleccionada(resultado.id)
    } catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo guardar la cuadrilla.' }) }
    finally { setGuardando(false) }
  }
  async function agregar() {
    if (!cuadrilla || !empleadoId) return
    setGuardando(true); setMensaje(null)
    try { await agregarMiembro(cuadrilla.id, Number(empleadoId)); setEmpleadoId(''); setMensaje({ tipo: 'exito', texto: 'Integrante agregado.' }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo agregar el integrante.' }) }
    finally { setGuardando(false) }
  }
  async function retirar(miembroId: number) {
    if (!cuadrilla) return
    setMensaje(null)
    try { await retirarMiembro(cuadrilla.id, miembroId); setMensaje({ tipo: 'exito', texto: 'La membresía se cerró y quedó en el historial.' }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo retirar el integrante.' }) }
  }
  async function lider(empleado: EmpleadoCuadrilla) {
    if (!cuadrilla) return
    setMensaje(null)
    try { await definirLider(cuadrilla.id, empleado.id); setMensaje({ tipo: 'exito', texto: `${nombreEmpleado(empleado)} es ahora el líder.` }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo definir el líder.' }) }
  }
  async function estado(item: Cuadrilla) {
    setMensaje(null)
    try { await cambiarEstadoCuadrilla(item.id, !item.activa); setMensaje({ tipo: 'exito', texto: `Cuadrilla ${item.activa ? 'desactivada' : 'activada'}.` }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar el estado.' }) }
  }

  let titulo = 'Cuadrillas'
  let descripcion = 'Organiza el personal de campo y define quién lidera cada equipo.'
  if (formularioVisible) {
    titulo = editando ? 'Editar cuadrilla' : 'Crear cuadrilla'
    descripcion = 'Registra los datos básicos del equipo de trabajo.'
  }
  let textoGuardar = 'Crear cuadrilla'
  if (editando) textoGuardar = 'Guardar cambios'
  if (guardando) textoGuardar = 'Guardando…'

  function contenidoLista() {
    if (cargando) return <p className="empty">Cargando cuadrillas…</p>
    if (cuadrillas.length === 0) return <p className="empty">No hay cuadrillas para estos filtros.</p>

    return <div className="crew-list">{cuadrillas.map((item) => {
      const activos = item.miembros.filter((miembro) => !miembro.fin)
      const liderActual = activos.find((miembro) => miembro.esLider)
      const textoLider = liderActual ? `Líder: ${nombreEmpleado(liderActual.empleado)}` : 'Sin líder definido'
      return <article key={item.id} className={`crew-item ${seleccionada === item.id ? 'selected' : ''}`}>
        <button type="button" className="crew-main" onClick={() => setSeleccionada(item.id)}><strong>{item.nombre}</strong><span>{activos.length} integrantes · {textoLider}</span></button>
        <div className="crew-actions"><span className={`status ${item.activa ? 'active' : 'inactive'}`}>{item.activa ? 'Activa' : 'Inactiva'}</span>
          <button type="button" onClick={() => { setEditando(item.id); setNombre(item.nombre); setFormularioVisible(true); setMensaje(null) }}>Editar</button>
          <button type="button" onClick={() => void estado(item)}>{item.activa ? 'Desactivar' : 'Activar'}</button>
        </div>
      </article>
    })}</div>
  }

  return <section aria-labelledby="cuadrillas-titulo">
    <div className="section-heading"><div><p className="eyebrow">Operaciones</p><h2 id="cuadrillas-titulo">{titulo}</h2><p>{descripcion}</p></div>{!formularioVisible && <button type="button" className="primary-button" onClick={() => { cancelarEdicion(); setFormularioVisible(true) }}>+ Crear cuadrilla</button>}</div>
    {mensaje && <div className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</div>}
    <div className="panel-grid cuadrillas-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {formularioVisible && <form className="card form-card" onSubmit={guardar}><div className="card-title"><h3>Datos de la cuadrilla</h3><button type="button" className="text-button" onClick={cancelarEdicion}>← Cuadrillas</button></div><label>Nombre<input required maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Cuadrilla Norte" /></label><button type="submit" className="primary-button" disabled={guardando}>{textoGuardar}</button><p className="form-hint">Al crearla podrás incorporar integrantes y definir su líder.</p></form>}
      {!formularioVisible && <div className="card list-card"><form className="filters crew-filters" onSubmit={(event) => { event.preventDefault(); void cargar() }}><input aria-label="Buscar por nombre" placeholder="Buscar cuadrilla" value={filtros.nombre} onChange={(event) => setFiltros({ ...filtros, nombre: event.target.value })} /><select aria-label="Filtrar por estado" value={filtros.estado} onChange={(event) => setFiltros({ ...filtros, estado: event.target.value as CuadrillaFiltros['estado'] })}><option value="activas">Activas</option><option value="inactivas">Inactivas</option><option value="todos">Todas</option></select><button type="submit" className="secondary-button">Buscar</button></form>
      {contenidoLista()}</div>}
    </div>
    {cuadrilla && <div className="card members-card"><div className="card-title"><div><h3>{cuadrilla.nombre}</h3><p>Integrantes vigentes e historial de pertenencia.</p></div></div>{cuadrilla.activa && <div className="member-add"><select value={empleadoId} onChange={(event) => setEmpleadoId(event.target.value)}><option value="">Seleccionar empleado activo</option>{empleadosDisponibles.map((empleado) => <option key={empleado.id} value={empleado.id}>{empleado.codEmpleado} · {nombreEmpleado(empleado)}{empleado.usuario?.rol.cod === 'TEC' && !empleado.habilitadoComoTecnico ? ' (sin habilitación técnica)' : ''}</option>)}</select><button type="button" className="secondary-button" disabled={!empleadoId || guardando} onClick={() => void agregar()}>Agregar integrante</button></div>}
      <div className="members-layout"><div><h4>Integrantes actuales</h4>{miembrosVigentes.length === 0 ? <p className="empty compact">Aún no hay integrantes.</p> : <div className="member-list">{miembrosVigentes.map((miembro) => <div className="member-row" key={miembro.id}><div><strong>{nombreEmpleado(miembro.empleado)}</strong><span>{miembro.empleado.codEmpleado}{miembro.empleado.usuario ? ` · ${miembro.empleado.usuario.rol.nombre}` : ''}</span></div><div className="member-actions">{miembro.esLider ? <span className="leader-badge">Líder</span> : <button type="button" onClick={() => void lider(miembro.empleado)}>Definir líder</button>}<button type="button" onClick={() => void retirar(miembro.id)}>Retirar</button></div></div>)}</div>}</div><div className="membership-history"><h4>Historial</h4>{historial.length === 0 ? <p className="empty compact">Sin retiros registrados.</p> : historial.map((miembro) => <div className="history-row" key={miembro.id}><strong>{nombreEmpleado(miembro.empleado)}{miembro.esLider ? ' · Líder' : ''}</strong><span>{fecha(miembro.inicio)} — {miembro.fin ? fecha(miembro.fin) : 'Vigente'}</span></div>)}</div></div>
    </div>}
  </section>
}
