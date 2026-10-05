import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { cambiarEstadoEquipo, crearEquipo, editarEquipo, listarEquipos, listarUbicaciones } from './equipos.api'
import type { Equipo, EquipoFiltros, EquipoInput, Ubicacion } from './equipos.types'

const filtrosIniciales: EquipoFiltros = { clienteId: '', ubicacionId: '', codigo: '', numeroSerie: '', estado: 'activos' }
const formularioVacio = { ubicacionId: '', codigo: '', tipo: '', marca: '', modelo: '', numeroSerie: '' }
type Formulario = typeof formularioVacio

function nombreCliente(ubicacion: Ubicacion) {
  const cliente = ubicacion.cliente
  const nombre = cliente.organizacion?.nombreComercial ?? cliente.organizacion?.razonSocial
    ?? (cliente.persona ? `${cliente.persona.firstName} ${cliente.persona.firstLastName}` : cliente.codigo)
  return `${cliente.codigo} · ${nombre}`
}

export default function EquiposManager() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [formulario, setFormulario] = useState<Formulario>(formularioVacio)
  const [editando, setEditando] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null)
  const [formularioVisible, setFormularioVisible] = useState(false)

  const clientes = useMemo(() => Array.from(new Map(ubicaciones.map((u) => [u.cliente.id, u])).values()), [ubicaciones])
  const ubicacionesFiltradas = filtros.clienteId
    ? ubicaciones.filter((u) => u.cliente.id === Number(filtros.clienteId)) : ubicaciones

  async function cargar(nuevosFiltros = filtros) {
    setCargando(true)
    try { setEquipos((await listarEquipos(nuevosFiltros)).items) }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cargar el inventario.' }) }
    finally { setCargando(false) }
  }

  useEffect(() => {
    Promise.all([listarUbicaciones(), listarEquipos(filtrosIniciales)])
      .then(([listaUbicaciones, listaEquipos]) => { setUbicaciones(listaUbicaciones); setEquipos(listaEquipos.items) })
      .catch((error) => setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron cargar los datos.' }))
      .finally(() => setCargando(false))
  }, [])

  function input(nombre: keyof Formulario, valor: string) { setFormulario((actual) => ({ ...actual, [nombre]: valor })) }
  function cancelarEdicion() { setEditando(null); setFormulario(formularioVacio); setFormularioVisible(false) }
  function comenzarEdicion(equipo: Equipo) {
    setEditando(equipo.id)
    setFormularioVisible(true)
    setFormulario({ ubicacionId: String(equipo.ubicacion.id), codigo: equipo.codigo, tipo: equipo.tipo, marca: equipo.marca ?? '', modelo: equipo.modelo ?? '', numeroSerie: equipo.numeroSerie ?? '' })
    setMensaje(null)
  }

  async function guardar(event: FormEvent) {
    event.preventDefault()
    setGuardando(true); setMensaje(null)
    if (!formulario.ubicacionId || !formulario.codigo.trim() || !formulario.tipo.trim()) { setMensaje({ tipo: 'error', texto: 'Ubicación, código y tipo son obligatorios.' }); setGuardando(false); return }
    const datos: EquipoInput = { ...formulario, ubicacionId: Number(formulario.ubicacionId), marca: formulario.marca || null, modelo: formulario.modelo || null, numeroSerie: formulario.numeroSerie || null }
    try {
      if (editando) await editarEquipo(editando, datos); else await crearEquipo(datos)
      setMensaje({ tipo: 'exito', texto: editando ? 'Equipo actualizado.' : 'Equipo registrado.' })
      cancelarEdicion(); await cargar()
    } catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo guardar el equipo.' }) }
    finally { setGuardando(false) }
  }

  async function cambiarEstado(equipo: Equipo) {
    setMensaje(null)
    try { await cambiarEstadoEquipo(equipo.id, !equipo.activo); setMensaje({ tipo: 'exito', texto: `Equipo ${equipo.activo ? 'desactivado' : 'reactivado'}.` }); await cargar() }
    catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar el estado.' }) }
  }

  return <section aria-labelledby="equipos-titulo">
    <div className="section-heading"><div><p className="eyebrow">Inventario</p><h2 id="equipos-titulo">{formularioVisible ? (editando ? 'Editar equipo' : 'Registrar equipo') : 'Equipos'}</h2><p>{formularioVisible ? 'Completa la información del activo técnico.' : 'Controla los activos instalados por cliente y ubicación.'}</p></div>{!formularioVisible && <button className="primary-button" onClick={() => { cancelarEdicion(); setFormularioVisible(true) }}>+ Registrar equipo</button>}</div>

    {mensaje && <div className={`notice ${mensaje.tipo}`} role="alert">{mensaje.texto}</div>}

    <div className="panel-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {formularioVisible && <form className="card form-card" onSubmit={guardar}>
        <div className="card-title"><h3>Datos del equipo</h3><button type="button" className="text-button" onClick={cancelarEdicion}>← Equipos</button></div>
        <label>Ubicación<select required value={formulario.ubicacionId} onChange={(e) => input('ubicacionId', e.target.value)}><option value="">Seleccionar ubicación</option>{ubicaciones.map((u) => <option key={u.id} value={u.id}>{nombreCliente(u)} · {u.nombre}</option>)}</select></label>
        <div className="two-columns"><label>Código<input required maxLength={40} value={formulario.codigo} onChange={(e) => input('codigo', e.target.value)} /></label><label>Tipo<input required maxLength={100} value={formulario.tipo} onChange={(e) => input('tipo', e.target.value)} /></label></div>
        <div className="two-columns"><label>Marca<input maxLength={100} value={formulario.marca} onChange={(e) => input('marca', e.target.value)} /></label><label>Modelo<input maxLength={100} value={formulario.modelo} onChange={(e) => input('modelo', e.target.value)} /></label></div>
        <label>Número de serie<input maxLength={150} value={formulario.numeroSerie} onChange={(e) => input('numeroSerie', e.target.value)} /></label>
        <button className="primary-button" disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar equipo'}</button>
      </form>}

      {!formularioVisible && <div className="card list-card">
        <form className="filters" onSubmit={(e) => { e.preventDefault(); setMensaje(null); void cargar() }}>
          <select aria-label="Filtrar por cliente" value={filtros.clienteId} onChange={(e) => setFiltros({ ...filtros, clienteId: e.target.value, ubicacionId: '' })}><option value="">Todos los clientes</option>{clientes.map((u) => <option key={u.cliente.id} value={u.cliente.id}>{nombreCliente(u)}</option>)}</select>
          <select aria-label="Filtrar por ubicación" value={filtros.ubicacionId} onChange={(e) => setFiltros({ ...filtros, ubicacionId: e.target.value })}><option value="">Todas las ubicaciones</option>{ubicacionesFiltradas.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
          <input aria-label="Buscar por código" placeholder="Código" value={filtros.codigo} onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })} />
          <input aria-label="Buscar por serie" placeholder="N.º de serie" value={filtros.numeroSerie} onChange={(e) => setFiltros({ ...filtros, numeroSerie: e.target.value })} />
          <select aria-label="Filtrar por estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as EquipoFiltros['estado'] })}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></select>
          <button className="secondary-button">Buscar</button>
        </form>
        {cargando ? <p className="empty">Cargando inventario…</p> : equipos.length === 0 ? <p className="empty">No hay equipos que coincidan con los filtros.</p> : <div className="table-wrap"><table><thead><tr><th>Equipo</th><th>Cliente / ubicación</th><th>Serie</th><th>Estado</th><th></th></tr></thead><tbody>{equipos.map((equipo) => <tr key={equipo.id}><td><strong>{equipo.codigo}</strong><span>{equipo.tipo} · {[equipo.marca, equipo.modelo].filter(Boolean).join(' ') || 'Sin marca/modelo'}</span></td><td><strong>{nombreCliente(equipo.ubicacion)}</strong><span>{equipo.ubicacion.nombre}</span></td><td>{equipo.numeroSerie ?? '—'}</td><td><span className={`status ${equipo.activo ? 'active' : 'inactive'}`}>{equipo.activo ? 'Activo' : 'Inactivo'}</span></td><td className="actions"><button onClick={() => comenzarEdicion(equipo)}>Editar</button><button onClick={() => void cambiarEstado(equipo)}>{equipo.activo ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></div>}
      </div>}
    </div>
  </section>
}
