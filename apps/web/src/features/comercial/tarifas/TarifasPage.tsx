import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { DataTable, type DataTableColumn, type SortDirection } from '../../erp-ui/components'
import {
  actualizarConcepto, cambiarEstadoTarifa, crearConcepto, crearTarifa, listarConceptos, listarTarifas, resolverPrecio,
  type ConceptoComercial, type EstadoCatalogo, type Pagina, type PrecioResuelto, type TarifaComercial, type TipoConcepto,
} from './tarifas.api'
import './tarifas.css'

type Seccion = 'conceptos' | 'tarifas'
type Carga = 'loading' | 'ready' | 'error'
const LIMITE = 25
const tipos: Array<{ value: TipoConcepto; label: string }> = [
  { value: 'SERVICIO', label: 'Servicio' }, { value: 'MANO_OBRA', label: 'Mano de obra' }, { value: 'EQUIPO', label: 'Equipo' },
  { value: 'REPUESTO', label: 'Repuesto' }, { value: 'INSUMO', label: 'Insumo' },
]
const precioNio = (value: string) => {
  const [integer, decimal = ''] = value.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `C$ ${grouped}.${decimal.padEnd(2, '0')}`
}
const fecha = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(date)
}
const mensaje = (cause: unknown) => cause instanceof Error ? cause.message : 'Ocurrió un error. Intenta de nuevo.'

export function TarifasPage() {
  const [seccion, setSeccion] = useState<Seccion>('conceptos')
  const [conceptos, setConceptos] = useState<ConceptoComercial[]>([])
  const [conceptosDisponibles, setConceptosDisponibles] = useState<ConceptoComercial[]>([])
  const [conceptosPagina, setConceptosPagina] = useState(1)
  const [conceptosHayMas, setConceptosHayMas] = useState(false)
  const [busquedaConcepto, setBusquedaConcepto] = useState('')
  const [cargaConceptos, setCargaConceptos] = useState<Carga>('ready')
  const [errorConceptos, setErrorConceptos] = useState('')
  const [revisionConceptos, setRevisionConceptos] = useState(0)
  const [tarifas, setTarifas] = useState<TarifaComercial[]>([])
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [q, setQ] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCatalogo>('todos')
  const [sortBy, setSortBy] = useState<'nombre' | 'codigo' | 'creadoEn' | 'id' | 'creadaEn'>('nombre')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [carga, setCarga] = useState<Carga>('loading')
  const [error, setError] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [errorClientes, setErrorClientes] = useState('')
  const [formulario, setFormulario] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [exito, setExito] = useState('')
  const [pendiente, setPendiente] = useState<{ type: Seccion; id: number; version: number; name: string; activo: boolean } | null>(null)
  const [editar, setEditar] = useState<ConceptoComercial | null>(null)
  const [resolver, setResolver] = useState<ConceptoComercial | TarifaComercial | null>(null)
  const [clienteResolver, setClienteResolver] = useState('')
  const [precioResuelto, setPrecioResuelto] = useState<PrecioResuelto | null>(null)
  const [errorResolver, setErrorResolver] = useState('')
  const [resolviendo, setResolviendo] = useState(false)
  const requestId = useRef(0)
  const opcionesRequestId = useRef(0)
  const submitLock = useRef(false)

  const cargar = useCallback(async (page = pagina) => {
    const id = ++requestId.current
    setCarga('loading'); setError('')
    try {
      const paging = { q: q.trim() || undefined, estado: estadoFiltro, pagina: page, limite: LIMITE, sortDir }
      const resultado: Pagina<ConceptoComercial> | Pagina<TarifaComercial> = seccion === 'conceptos'
        ? await listarConceptos({ ...paging, sortBy: sortBy as 'nombre' | 'codigo' | 'creadoEn' })
        : await listarTarifas({ ...paging, sortBy: sortBy as 'id' | 'creadaEn' })
      if (requestId.current !== id) return
      if (seccion === 'conceptos') setConceptos((resultado as Pagina<ConceptoComercial>).items)
      else setTarifas((resultado as Pagina<TarifaComercial>).items)
      setPagina(resultado.pagina); setHayMas(resultado.hayMas); setCarga('ready')
    } catch (cause) {
      if (requestId.current !== id) return
      setError(mensaje(cause)); setCarga('error')
    }
  }, [estadoFiltro, pagina, q, seccion, sortBy, sortDir])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) void cargar() })
    return () => { active = false; requestId.current += 1 }
  }, [cargar])

  useEffect(() => {
    let active = true
    listarClientes().then(value => { if (active) setClientes(value) }).catch(cause => { if (active) setErrorClientes(mensaje(cause)) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!formulario || seccion !== 'tarifas') return
    let active = true
    const id = ++opcionesRequestId.current
    queueMicrotask(() => { if (active && opcionesRequestId.current === id) { setCargaConceptos('loading'); setErrorConceptos('') } })
    listarConceptos({ q: busquedaConcepto.trim() || undefined, estado: 'activos', pagina: conceptosPagina, limite: LIMITE, sortBy: 'nombre', sortDir: 'asc' })
      .then(value => { if (active && opcionesRequestId.current === id) { setConceptosDisponibles(value.items); setConceptosHayMas(value.hayMas); setCargaConceptos('ready') } })
      .catch(cause => { if (active && opcionesRequestId.current === id) { setErrorConceptos(mensaje(cause)); setCargaConceptos('error') } })
    return () => { active = false; opcionesRequestId.current += 1 }
  }, [formulario, seccion, busquedaConcepto, conceptosPagina, revisionConceptos])

  const resetForm = () => { setFormulario(false); setEditar(null); setFormError('') }
  const cambiarSeccion = (value: Seccion) => {
    setSeccion(value); setPagina(1); setQ(''); setEstadoFiltro('todos'); setPendiente(null); resetForm()
    setSortBy(value === 'conceptos' ? 'nombre' : 'creadaEn'); setSortDir(value === 'conceptos' ? 'asc' : 'desc')
  }
  const onSort = (key: string, direction: SortDirection) => {
    setSortBy(key as typeof sortBy); setSortDir(direction); setPagina(1)
  }
  async function guardarConcepto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current || saving) return
    setFormError('')
    const form = new FormData(event.currentTarget)
    const nombre = String(form.get('nombre') ?? '').trim()
    const unidad = String(form.get('unidad') ?? '').trim()
    if (!nombre || nombre.length > 150 || !unidad || unidad.length > 30) { setFormError('Completa nombre (1–150) y unidad (1–30).'); return }
    submitLock.current = true; setSaving(true)
    try {
      if (editar) {
        await actualizarConcepto(editar.id, { version: editar.version, nombre, unidad })
        setExito(`Concepto ${nombre} actualizado.`)
      } else {
        const codigo = String(form.get('codigo') ?? '').trim().toUpperCase()
        const tipo = String(form.get('tipo') ?? '') as TipoConcepto
        if (!codigo || codigo.length > 40 || !tipos.some(item => item.value === tipo)) throw new Error('Completa código (1–40) y tipo.')
        await crearConcepto({ codigo, tipo, nombre, unidad })
        setExito(`Concepto ${codigo} creado.`)
      }
      setRevisionConceptos(value => value + 1)
      resetForm(); setPagina(1); await cargar(1)
    } catch (cause) { setFormError(mensaje(cause)) }
    finally { submitLock.current = false; setSaving(false) }
  }
  async function guardarTarifa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current || saving) return
    setFormError('')
    const form = new FormData(event.currentTarget)
    const conceptoId = Number(form.get('conceptoId'))
    const clienteId = String(form.get('clienteId') ?? '')
    const precio = String(form.get('precio') ?? '').trim()
    if (!Number.isInteger(conceptoId) || conceptoId < 1) { setFormError('Selecciona un concepto.'); return }
    if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,2})?$/.test(precio) || precio.length > 20) { setFormError('Escribe un precio NIO no negativo con hasta dos decimales.'); return }
    submitLock.current = true; setSaving(true)
    try {
      await crearTarifa({ conceptoId, clienteId: clienteId ? Number(clienteId) : null, moneda: 'NIO', precio })
      const concept = conceptos.find(item => item.id === conceptoId)
      setExito(`Tarifa creada para ${concept?.codigo ?? `concepto #${conceptoId}`}.`)
      resetForm(); setQ(''); setEstadoFiltro('todos'); setSortBy('creadaEn'); setSortDir('desc'); setPagina(1)
      try {
        const resultado = await listarTarifas({ estado: 'todos', pagina: 1, limite: LIMITE, sortBy: 'creadaEn', sortDir: 'desc' })
        setTarifas(resultado.items); setPagina(resultado.pagina); setHayMas(resultado.hayMas); setCarga('ready'); setError('')
      } catch (cause) { setError(mensaje(cause)); setCarga('error') }
    } catch (cause) { setFormError(mensaje(cause)) }
    finally { submitLock.current = false; setSaving(false) }
  }
  async function confirmarDesactivacion() {
    if (!pendiente || saving) return
    setSaving(true); setErrorAccion(''); setError('')
    try {
      if (pendiente.type === 'conceptos') await actualizarConcepto(pendiente.id, { version: pendiente.version, activo: pendiente.activo })
      else await cambiarEstadoTarifa(pendiente.id, pendiente.version, pendiente.activo)
      setExito(`${pendiente.type === 'conceptos' ? 'Concepto' : 'Tarifa'} ${pendiente.name} ${pendiente.activo ? 'activado' : 'desactivado'}.`)
      if (pendiente.type === 'conceptos') setRevisionConceptos(value => value + 1)
      setPendiente(null); await cargar()
    } catch (cause) { setErrorAccion(mensaje(cause)); setPendiente(null); await cargar() }
    finally { setSaving(false) }
  }
  async function ejecutarResolver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resolver || !clienteResolver) { setErrorResolver('Selecciona un cliente para consultar el precio.'); return }
    setResolviendo(true); setErrorResolver(''); setPrecioResuelto(null)
    try { setPrecioResuelto(await resolverPrecio('conceptoId' in resolver ? resolver.conceptoId : resolver.id, Number(clienteResolver))) }
    catch (cause) { setErrorResolver(mensaje(cause)) }
    finally { setResolviendo(false) }
  }

  const clienteNombre = useCallback((id: number | null) => id === null ? 'Estándar' : clientes.find(item => item.id === id) ? nombreCliente(clientes.find(item => item.id === id)!) : `Cliente #${id}`, [clientes])
  const columnasConceptos = useMemo<readonly DataTableColumn<ConceptoComercial>[]>(() => [
    { key: 'codigo', header: 'Código', sortable: true, render: row => <strong>{row.codigo}</strong> },
    { key: 'nombre', header: 'Concepto', sortable: true, render: row => <div><strong>{row.nombre}</strong><small className="tarifas__subline">{tipos.find(type => type.value === row.tipo)?.label ?? row.tipo} · {row.unidad}</small></div> },
    { key: 'estado', header: 'Estado', render: row => <span className={`tarifas__badge ${row.activo ? 'is-active' : 'is-inactive'}`}><span aria-hidden="true">{row.activo ? '●' : '○'}</span> {row.activo ? 'Activo' : 'Inactivo'}</span> },
    { key: 'creadoEn', header: 'Creado', sortable: true, render: row => fecha(row.creadoEn) },
    { key: 'acciones', header: 'Acciones', align: 'end', render: row => <div className="tarifas__actions">
      <details className="tarifas__menu"><summary aria-label={`Acciones para ${row.nombre}`}>•••</summary><button type="button" onClick={() => { setEditar(row); setFormulario(true); setFormError('') }}>Editar concepto</button>{row.activo && <button type="button" onClick={() => setResolver(row)}>Resolver precio</button>}<button type="button" onClick={() => { setErrorAccion(''); setPendiente({ type: 'conceptos', id: row.id, version: row.version, name: row.codigo, activo: !row.activo }) }}>{row.activo ? 'Desactivar concepto' : 'Activar concepto'}</button></details>
    </div> },
  ], [])
  const columnasTarifas = useMemo<readonly DataTableColumn<TarifaComercial>[]>(() => [
    { key: 'concepto', header: 'Concepto', render: row => <div><strong>{row.concepto.codigo} · {row.concepto.nombre}</strong><small className="tarifas__subline">{row.concepto.tipo} · {row.concepto.unidad}</small></div> },
    { key: 'cliente', header: 'Aplicación', render: row => <span>{clienteNombre(row.clienteId)}</span> },
    { key: 'precio', header: 'Precio de venta', align: 'end', render: row => <strong className="tarifas__price">{precioNio(row.precio)}</strong> },
    { key: 'estado', header: 'Estado', render: row => <span className={`tarifas__badge ${row.activo ? 'is-active' : 'is-inactive'}`}><span aria-hidden="true">{row.activo ? '●' : '○'}</span> {row.activo ? 'Activo' : 'Inactivo'}</span> },
    { key: 'creadaEn', header: 'Vigente desde', sortable: true, render: row => fecha(row.creadaEn) },
    { key: 'acciones', header: 'Acciones', align: 'end', render: row => <div className="tarifas__actions"><details className="tarifas__menu"><summary aria-label={`Acciones para ${row.concepto.codigo} ${clienteNombre(row.clienteId)}`}>•••</summary><button type="button" onClick={() => setResolver(row)}>Resolver precio</button><button type="button" onClick={() => { setErrorAccion(''); setPendiente({ type: 'tarifas', id: row.id, version: row.version, name: row.concepto.codigo, activo: !row.activo }) }}>{row.activo ? 'Desactivar tarifa' : 'Activar tarifa'}</button></details></div> },
  ], [clienteNombre])

  const activeConcepts = conceptosDisponibles.filter(item => item.activo)
  const rows = seccion === 'conceptos' ? conceptos : tarifas
  return <section className="tarifas" aria-labelledby="tarifas-title">
    <header className="tarifas__header"><div><p className="tarifas__eyebrow">COMERCIAL <span>/</span> CATÁLOGO</p><h1 id="tarifas-title">Conceptos y tarifas</h1><p>Organiza los conceptos y consulta sus precios de venta vigentes.</p></div>
      {!formulario && <button type="button" className="tarifas__primary" onClick={() => { setEditar(null); setFormulario(true); setFormError('') }}>+ {seccion === 'conceptos' ? 'Nuevo concepto' : 'Nueva tarifa'}</button>}
    </header>
    {exito && <p className="tarifas__success" role="status">✓ {exito}</p>}
    <div className="tarifas__tabs" role="tablist" aria-label="Catálogo comercial">
      <button type="button" role="tab" aria-selected={seccion === 'conceptos'} aria-controls="catalogo-panel" disabled={saving} onClick={() => cambiarSeccion('conceptos')}>Conceptos</button>
      <button type="button" role="tab" aria-selected={seccion === 'tarifas'} aria-controls="catalogo-panel" disabled={saving} onClick={() => cambiarSeccion('tarifas')}>Tarifas</button>
    </div>
    {formulario && <form className="tarifas__form" aria-label={editar ? 'Editar concepto' : seccion === 'conceptos' ? 'Nuevo concepto' : 'Nueva tarifa'} onSubmit={seccion === 'conceptos' ? guardarConcepto : guardarTarifa}>
      <div className="tarifas__form-heading"><div><span className="tarifas__form-icon" aria-hidden="true">{seccion === 'conceptos' ? '◇' : '₦'}</span><div><h2>{editar ? 'Editar concepto' : seccion === 'conceptos' ? 'Crear concepto' : 'Crear tarifa'}</h2><p>{seccion === 'conceptos' ? 'Define un elemento reutilizable del catálogo.' : 'El precio se guarda en córdobas y conserva su historial.'}</p></div></div><button type="button" className="tarifas__close" aria-label="Cerrar formulario" disabled={saving} onClick={resetForm}>×</button></div>
      {seccion === 'conceptos' ? <div className="tarifas__fields">
        {!editar && <label>Código<input name="codigo" required maxLength={40} placeholder="Ej. MANT-001" /></label>}
        {!editar && <label>Tipo<select name="tipo" defaultValue="SERVICIO">{tipos.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <label>Nombre<input name="nombre" required maxLength={150} defaultValue={editar?.nombre ?? ''} placeholder="Ej. Mantenimiento preventivo" /></label>
        <label>Unidad<input name="unidad" required maxLength={30} defaultValue={editar?.unidad ?? ''} placeholder="Ej. servicio, hora, unidad" /></label>
      </div> : <div className="tarifas__fields">
        <label>Buscar concepto<input value={busquedaConcepto} maxLength={100} onChange={event => { setBusquedaConcepto(event.currentTarget.value); setConceptosPagina(1) }} placeholder="Código o nombre" /></label>
        <label>Concepto<select name="conceptoId" required defaultValue="" disabled={cargaConceptos !== 'ready'}><option value="" disabled>Selecciona un concepto</option>{activeConcepts.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select></label>
        <div className="tarifas__option-pages" aria-live="polite">{cargaConceptos === 'loading' ? <span>Buscando conceptos…</span> : errorConceptos ? <span role="alert">{errorConceptos}</span> : activeConcepts.length === 0 ? <span>No hay conceptos activos para esta búsqueda.</span> : <><span>Página {conceptosPagina} · {activeConcepts.length} conceptos</span><button type="button" disabled={conceptosPagina <= 1} onClick={() => setConceptosPagina(value => value - 1)}>Anterior</button><button type="button" disabled={!conceptosHayMas} onClick={() => setConceptosPagina(value => value + 1)}>Siguiente</button></>}</div>
        <label>Cliente<select name="clienteId" defaultValue=""><option value="">Tarifa estándar · para cualquier cliente</option>{clientes.filter(item => item.activo).map(item => <option key={item.id} value={item.id}>{nombreCliente(item)}</option>)}</select></label>
        <label>Precio de venta (NIO)<div className="tarifas__money-input"><span aria-hidden="true">C$</span><input name="precio" required inputMode="decimal" maxLength={20} placeholder="0.00" /><span>NIO</span></div></label>
        <p className="tarifas__hint">Una tarifa específica de cliente tiene prioridad sobre la tarifa estándar al resolver el precio.</p>
      </div>}
      {formError && <p className="tarifas__error" role="alert">{formError}</p>}
      <footer><button type="button" className="tarifas__secondary" disabled={saving} onClick={resetForm}>Cancelar</button><button type="submit" className="tarifas__primary" disabled={saving}>{saving ? 'Guardando…' : editar ? 'Guardar cambios' : 'Guardar'}</button></footer>
    </form>}
    {pendiente && <div className="tarifas__confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-copy"><span aria-hidden="true">!</span><div><strong id="confirm-title">{pendiente.activo ? 'Activar' : 'Desactivar'} {pendiente.type === 'conceptos' ? 'concepto' : 'tarifa'} {pendiente.name}?</strong><p id="confirm-copy">El historial se conserva. Solo las tarifas activas participan al resolver precios.</p></div><button type="button" className="tarifas__secondary" disabled={saving} onClick={() => setPendiente(null)}>Cancelar</button><button type="button" className={pendiente.activo ? 'tarifas__primary' : 'tarifas__danger'} disabled={saving} onClick={() => void confirmarDesactivacion()}>{saving ? 'Guardando…' : pendiente.activo ? 'Activar' : 'Desactivar'}</button></div>}
    {errorAccion && <p className="tarifas__error" role="alert">{errorAccion}</p>}
    {error && <p className="tarifas__error" role="alert">{error}</p>}
    <section className="tarifas__catalog" id="catalogo-panel" role="tabpanel" aria-label={seccion === 'conceptos' ? 'Catálogo de conceptos' : 'Listado de tarifas'}>
      <div className="tarifas__catalog-head"><div><h2>{seccion === 'conceptos' ? 'Catálogo de conceptos' : 'Tarifas registradas'}</h2><p>{seccion === 'conceptos' ? 'Servicios y productos disponibles para cotizar.' : 'Precios de venta estándar y por cliente.'}</p></div><label className="tarifas__status">Estado<select aria-label="Filtrar por estado" value={estadoFiltro} onChange={event => { setEstadoFiltro(event.currentTarget.value as EstadoCatalogo); setPagina(1) }}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></select></label></div>
      <DataTable<ConceptoComercial | TarifaComercial> columns={seccion === 'conceptos' ? columnasConceptos as readonly DataTableColumn<ConceptoComercial | TarifaComercial>[] : columnasTarifas as readonly DataTableColumn<ConceptoComercial | TarifaComercial>[]} rows={rows} getRowKey={row => row.id}
        search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPagina(1) }, placeholder: seccion === 'conceptos' ? 'Buscar por código o concepto' : 'Buscar por código o concepto', label: 'Buscar' }}
        sort={{ key: sortBy, direction: sortDir, onChange: onSort }} pagination={{ pagina, limite: LIMITE, hayMas, onPageChange: setPagina }} state={carga} error={{ description: error }} onRetry={() => void cargar()}
        emptyTitle={q ? 'No hay resultados' : seccion === 'conceptos' ? 'No hay conceptos en este estado' : 'No hay tarifas en este estado'} emptyDescription={q ? 'Prueba con otro término.' : 'Crea el primer registro con la acción de esta pantalla.'} />
    </section>
    {resolver && <section className="tarifas__resolver" role="region" aria-labelledby="resolver-title">
        <button type="button" className="tarifas__close" aria-label="Cerrar resolución" onClick={() => { setResolver(null); setPrecioResuelto(null); setErrorResolver('') }}>×</button>
        <span className="tarifas__resolver-icon" aria-hidden="true">⌕</span><p className="tarifas__eyebrow">CONSULTA DE PRECIO</p><h2 id="resolver-title">Resolver tarifa</h2><p>{'concepto' in resolver ? `${resolver.concepto.codigo} · ${resolver.concepto.nombre}` : `${resolver.codigo} · ${resolver.nombre}`}</p>
        <form onSubmit={event => void ejecutarResolver(event)}><label>Cliente<select value={clienteResolver} onChange={event => setClienteResolver(event.currentTarget.value)} required><option value="">Selecciona un cliente</option>{clientes.filter(item => item.activo).map(item => <option key={item.id} value={item.id}>{nombreCliente(item)}</option>)}</select></label>{errorClientes && <p role="alert">No se pudo cargar la lista de clientes: {errorClientes}</p>}{errorResolver && <p className="tarifas__error" role="alert">{errorResolver}</p>}<button className="tarifas__primary" type="submit" disabled={resolviendo || !clientes.length}>{resolviendo ? 'Consultando…' : 'Consultar precio'}</button></form>
        {precioResuelto && <div className="tarifas__resolved" role="status"><span>Precio encontrado</span><strong>{precioNio(precioResuelto.precio)}</strong><small>{precioResuelto.origen === 'CLIENTE' ? 'Tarifa específica de cliente' : 'Tarifa estándar'} · {precioResuelto.moneda}</small></div>}
      </section>
    }
  </section>
}
