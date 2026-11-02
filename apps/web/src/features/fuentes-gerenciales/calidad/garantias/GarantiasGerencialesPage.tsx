import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../../shared/ui'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente } from '../../../clientes/clientes.types'
import type { Cliente } from '../../../clientes/clientes.types'
import { listarEquipos } from '../../../equipos/equipos.api'
import type { Equipo } from '../../../equipos/equipos.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { DataTable, ModuleHeader, SemanticBadge } from '../../../erp-ui'
import { LIMITE_CALIDAD, fechaManagua, managuaAhora, managuaIso, nuevaClave, validarId } from './fechas'
import { crearGarantia, listarGarantias, obtenerGarantia } from './garantias.api'
import type { CrearGarantia, FiltrosGarantias, GarantiaGerencial } from './garantias.types'
import './calidad.css'

type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
type EstadoCarga = 'loading' | 'ready' | 'error'
const nombreActivo = (c: Cliente) => nombreCliente(c)
const errMsg = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado.'
async function cargarEquiposCliente(clienteId: string) {
  const items: Equipo[] = []; let pagina = 1; let hayMas = true
  while (hayMas) { const result = await listarEquipos({ clienteId, ubicacionId: '', codigo: '', numeroSerie: '', estado: 'todos', pagina, limite: LIMITE_CALIDAD }); items.push(...result.items); hayMas = result.hayMas; pagina++ }
  return items
}
async function cargarOrdenesCliente(clienteId: string) {
  const items: OrdenResumen[] = []; let pagina = 1; let hayMas = true
  while (hayMas) { const result = await listarOrdenes({ estado: '', buscar: '', pagina, limite: LIMITE_CALIDAD, clienteId }); items.push(...result.items); hayMas = result.hayMas; pagina++ }
  return items
}

export function GarantiasGerencialesPage({ onBusyChange }: Props) {
  const [items, setItems] = useState<GarantiaGerencial[]>([])
  const [pagina, setPagina] = useState(1)
  const [hayMas, setHayMas] = useState(false)
  const [q, setQ] = useState('')
  const [clienteFiltro, setClienteFiltro] = useState('')
  const [activoFiltro, setActivoFiltro] = useState('')
  const [estado, setEstado] = useState<EstadoCarga>('loading')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [depRevision, setDepRevision] = useState(0)
  const req = useRef(0)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesError, setClientesError] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clientePagina, setClientePagina] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [selected, setSelected] = useState<GarantiaGerencial | null>(null)
  const [form, setForm] = useState({ referencia: '', clienteId: '', tipo: 'SERVICIO' as CrearGarantia['tipo'], activoReferencia: '', equipoId: '', ordenId: '', inicio: managuaAhora(), fin: '', cobertura: '', exclusiones: '' })
  const keyRef = useRef(nuevaClave())
  const intentRef = useRef('')
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([])
  const [dependientesError, setDependientesError] = useState('')
  const [dependientesBusy, setDependientesBusy] = useState(false)
  const depReq = useRef(0)

  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; listarClientes().then((data) => { if (active) setClientes(data) }).catch((e: unknown) => { if (active) setClientesError(errMsg(e)) }) }); return () => { active = false } }, [])
  const load = useCallback(() => {
    const id = ++req.current
    setEstado('loading'); setError('')
    queueMicrotask(() => {
      const filtros: FiltrosGarantias = { q: q.trim() || undefined, clienteId: clienteFiltro ? Number(clienteFiltro) : undefined, activoReferencia: activoFiltro.trim() || undefined, pagina, limite: LIMITE_CALIDAD }
      listarGarantias(filtros).then((data) => { if (req.current === id) { setItems(data.items); setHayMas(data.hayMas); setEstado('ready') } }).catch((e: unknown) => { if (req.current === id) { setError(errMsg(e)); setEstado('error') } })
    })
    return () => { if (req.current === id) req.current++ }
  }, [q, clienteFiltro, activoFiltro, pagina])
  useEffect(() => { let active = true; let cancel = () => {}; queueMicrotask(() => { if (active) cancel = load() ?? (() => {}) }); return () => { active = false; cancel() } }, [load, revision])
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('garantiaId')
    if (!raw || !/^\d+$/.test(raw) || !validarId(Number(raw))) return
    let active = true
    queueMicrotask(() => { if (active) void obtenerGarantia(Number(raw)).then((data) => { if (active) setSelected(data) }).catch((e: unknown) => { if (active) { setError(errMsg(e)); setEstado('error') } }) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    let id = 0
    queueMicrotask(() => {
    if (!active) return
    id = ++depReq.current
    setEquipos([]); setOrdenes([]); setDependientesError('')
    if (!showForm || !form.clienteId) { setDependientesBusy(false); return }
    setDependientesBusy(true)
    Promise.all([cargarEquiposCliente(form.clienteId), cargarOrdenesCliente(form.clienteId)]).then(([eq, ord]) => { if (active && depReq.current === id) { setEquipos(eq); setOrdenes(ord); setDependientesBusy(false) } }).catch((e: unknown) => { if (active && depReq.current === id) { setDependientesError(errMsg(e)); setDependientesBusy(false) } })
    })
    return () => { active = false }
  }, [form.clienteId, showForm, depRevision])

  const clientesVisibles = useMemo(() => {
    const f = busquedaCliente.trim().toLocaleLowerCase('es-NI')
    return clientes.filter((c) => !f || `${nombreActivo(c)} ${c.codigo}`.toLocaleLowerCase('es-NI').includes(f)).slice((clientePagina - 1) * LIMITE_CALIDAD, clientePagina * LIMITE_CALIDAD)
  }, [clientes, busquedaCliente, clientePagina])
  const columnas = useMemo(() => [
    { key: 'referencia', header: 'Referencia', render: (r: GarantiaGerencial) => <button className="calidad-link" type="button" onClick={() => void openDetail(r.id)}>{r.referencia}</button> },
    { key: 'cliente', header: 'Cliente / activo', render: (r: GarantiaGerencial) => <>{r.clienteNombre}<small>{r.activoReferencia}</small></> },
    { key: 'vigencia', header: 'Vigencia', render: (r: GarantiaGerencial) => <>{fechaManagua(r.inicio)} – {fechaManagua(r.fin)}</> },
    { key: 'estado', header: 'Estado', render: (r: GarantiaGerencial) => <SemanticBadge label={r.estado === 'VIGENTE' ? 'Vigente' : r.estado === 'FUTURA' ? 'Futura' : 'Vencida'} variant={r.estado === 'VIGENTE' ? 'success' : r.estado === 'FUTURA' ? 'info' : 'warning'} /> },
  ], [])
  async function openDetail(id: number) { setFormError(''); try { setSelected(await obtenerGarantia(id)) } catch (e) { setError(errMsg(e)); setEstado('error') } }
  function openCreate() { setSelected(null); setFormError(''); setFormSuccess(''); keyRef.current = nuevaClave(); intentRef.current = ''; setForm({ referencia: '', clienteId: '', tipo: 'SERVICIO', activoReferencia: '', equipoId: '', ordenId: '', inicio: managuaAhora(), fin: '', cobertura: '', exclusiones: '' }); setShowForm(true) }
  function closeForm() { if (busy) return; setShowForm(false); setFormError(''); setFormSuccess('') }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return
    setFormError(''); setFormSuccess('')
    const inicio = managuaIso(form.inicio); const fin = managuaIso(form.fin)
    if (!inicio || !fin || new Date(inicio).getTime() >= new Date(fin).getTime()) { setFormError('La fecha final debe ser posterior a la inicial.'); return }
    const payload: CrearGarantia = { referencia: form.referencia.trim().toUpperCase(), clienteId: Number(form.clienteId), tipo: form.tipo, activoReferencia: form.activoReferencia.trim().toUpperCase(), ...(form.equipoId ? { equipoId: Number(form.equipoId) } : {}), ...(form.ordenId ? { ordenId: Number(form.ordenId) } : {}), inicio, fin, cobertura: form.cobertura.trim(), ...(form.exclusiones.trim() ? { exclusiones: form.exclusiones.trim() } : {}) }
    if (!validarId(payload.clienteId) || (payload.equipoId && !validarId(payload.equipoId)) || (payload.ordenId && !validarId(payload.ordenId))) { setFormError('Selecciona un cliente, equipo y orden válidos.'); return }
    const intent = JSON.stringify(payload); if (intentRef.current !== intent) { intentRef.current = intent; keyRef.current = nuevaClave() }
    setBusy(true); onBusyChange?.(true)
    try { const result = await crearGarantia(payload, keyRef.current); keyRef.current = nuevaClave(); setFormSuccess(`Garantía ${result.referencia} registrada.`); setSelected(result); setShowForm(false); setPagina(1); setRevision((n) => n + 1) }
    catch (e) { setFormError(e instanceof Error && 'status' in e && e.status === 409 ? 'El registro cambió o la referencia ya existe. El formulario se conserva; revisa los datos antes de volver a intentar.' : errMsg(e)) }
    finally { setBusy(false); onBusyChange?.(false) }
  }

  return <main className="calidad-source">
    <ModuleHeader breadcrumb={<a href="/inteligencia/origen/calidad">Registros de origen de calidad</a>} title="Garantías" description="Registra y consulta la cobertura acordada para cada activo." action={!showForm && !selected ? <Button variant="primary" onClick={openCreate}>Nueva garantía</Button> : undefined} />
    {formSuccess && <p className="calidad-notice" role="status">{formSuccess}</p>}
    {showForm ? <section className="calidad-panel" aria-labelledby="garantia-form-title"><h2 id="garantia-form-title">Nueva garantía</h2>
      <p className="calidad-hint">La referencia del activo es una clave estable elegida por tu equipo; no se genera desde el nombre del equipo.</p>
      {formError && <p className="calidad-error" role="alert">{formError}</p>}{clientesError && <p className="calidad-error" role="alert">No se pudieron cargar clientes: {clientesError} <button type="button" onClick={() => { setClientesError(''); listarClientes().then(setClientes).catch((e: unknown) => setClientesError(errMsg(e))) }}>Reintentar</button></p>}
      <form onSubmit={(e) => void submit(e)} className="calidad-form">
        <label>Referencia<input required maxLength={100} value={form.referencia} disabled={busy} onChange={(e) => setForm({ ...form, referencia: e.target.value })} /></label>
        <label>Cliente<select required value={form.clienteId} disabled={busy || !!clientesError} onChange={(e) => { setForm({ ...form, clienteId: e.target.value, equipoId: '', ordenId: '' }); setClientePagina(1) }}><option value="">Selecciona cliente</option>{clientesVisibles.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c)}{c.activo ? '' : ' (inactivo)'}</option>)}</select><input aria-label="Buscar cliente" placeholder="Filtrar clientes" value={busquedaCliente} disabled={busy} onChange={(e) => { setBusquedaCliente(e.target.value); setClientePagina(1) }} /><span className="calidad-inline"><button type="button" disabled={busy || clientePagina <= 1} onClick={() => setClientePagina((n) => n - 1)}>Clientes anteriores</button><button type="button" disabled={busy || clientePagina * LIMITE_CALIDAD >= clientes.filter((c) => !busquedaCliente || nombreCliente(c).toLowerCase().includes(busquedaCliente.toLowerCase()) || c.codigo.toLowerCase().includes(busquedaCliente.toLowerCase())).length} onClick={() => setClientePagina((n) => n + 1)}>Más clientes</button></span></label>
        <label>Tipo<select value={form.tipo} disabled={busy} onChange={(e) => setForm({ ...form, tipo: e.target.value as CrearGarantia['tipo'] })}><option value="SERVICIO">Servicio</option><option value="EQUIPO">Equipo</option><option value="REPUESTO">Repuesto</option><option value="COMPONENTE">Componente</option></select></label>
        <label>Referencia del activo<input required maxLength={100} value={form.activoReferencia} disabled={busy} onChange={(e) => setForm({ ...form, activoReferencia: e.target.value.toUpperCase(), equipoId: '', ordenId: '' })} /></label>
        <label>Equipo relacionado (opcional)<select value={form.equipoId} disabled={busy || !form.clienteId || dependientesBusy} onChange={(e) => setForm({ ...form, equipoId: e.target.value })}><option value="">Sin equipo asociado</option>{equipos.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.tipo} {e.numeroSerie ? `· ${e.numeroSerie}` : ''}{e.activo ? '' : ' (inactivo)'}</option>)}</select></label>
        <label>Orden de origen (opcional)<select value={form.ordenId} disabled={busy || !form.clienteId || dependientesBusy} onChange={(e) => setForm({ ...form, ordenId: e.target.value })}><option value="">Sin orden de origen</option>{ordenes.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.estadoCodigo}{o.estadoCodigo === 'CANCELADA' ? ' (cancelada)' : ''}</option>)}</select></label>
        {dependientesError && <p className="calidad-error" role="alert">No se pudieron cargar equipos y órdenes: {dependientesError} <button type="button" onClick={() => setDepRevision((n) => n + 1)}>Reintentar</button></p>}
        <label>Inicio<input type="datetime-local" required value={form.inicio} disabled={busy} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>
        <label>Fin<input type="datetime-local" required value={form.fin} disabled={busy} onChange={(e) => setForm({ ...form, fin: e.target.value })} /></label>
        <label className="calidad-wide">Cobertura<textarea required maxLength={2000} rows={3} value={form.cobertura} disabled={busy} onChange={(e) => setForm({ ...form, cobertura: e.target.value })} /></label>
        <label className="calidad-wide">Exclusiones (opcional)<textarea maxLength={2000} rows={3} value={form.exclusiones} disabled={busy} onChange={(e) => setForm({ ...form, exclusiones: e.target.value })} /></label>
        <div className="calidad-actions calidad-wide"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar garantía'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={closeForm}>Cancelar</Button></div>
      </form>
    </section> : selected ? <section className="calidad-panel" aria-labelledby="garantia-detail-title"><div className="calidad-detail-head"><div><h2 id="garantia-detail-title">{selected.referencia}</h2><SemanticBadge label={selected.estado === 'VIGENTE' ? 'Vigente' : selected.estado === 'FUTURA' ? 'Futura' : 'Vencida'} variant={selected.estado === 'VIGENTE' ? 'success' : selected.estado === 'FUTURA' ? 'info' : 'warning'} /></div><Button variant="secondary" onClick={() => setSelected(null)}>Volver al listado</Button></div><dl className="calidad-dl">{[['Cliente', selected.clienteNombre], ['Activo', selected.activoReferencia], ['Tipo', selected.tipo], ['Inicio', fechaManagua(selected.inicio)], ['Fin', fechaManagua(selected.fin)], ['Cobertura', selected.cobertura], ['Exclusiones', selected.exclusiones || 'Sin exclusiones registradas'], ['Equipo relacionado', selected.equipoId ? `Equipo #${selected.equipoId}` : 'No asociado'], ['Orden relacionada', selected.ordenId ? `Orden #${selected.ordenId}` : 'No asociada'], ['Registrada', fechaManagua(selected.registradaEn)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : <>
      <section className="calidad-filters" aria-label="Filtros de garantías"><label>Buscar<input value={q} placeholder="Referencia o activo" onChange={(e) => { setQ(e.target.value); setPagina(1) }} /></label><label>Cliente<select value={clienteFiltro} onChange={(e) => { setClienteFiltro(e.target.value); setPagina(1) }}><option value="">Todos los clientes</option>{clientes.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c)}{c.activo ? '' : ' (inactivo)'}</option>)}</select></label><label>Activo<input value={activoFiltro} placeholder="Referencia exacta" onChange={(e) => { setActivoFiltro(e.target.value); setPagina(1) }} /></label></section>
      <DataTable columns={columnas} rows={items} getRowKey={(r) => r.id} pagination={{ pagina, limite: LIMITE_CALIDAD, hayMas, onPageChange: setPagina, label: 'Páginas de garantías' }} state={estado} error={{ description: error }} onRetry={() => setRevision((n) => n + 1)} emptyTitle="No hay garantías para estos filtros" emptyDescription="Registra una garantía o ajusta los filtros." />
    </>}
  </main>
}
