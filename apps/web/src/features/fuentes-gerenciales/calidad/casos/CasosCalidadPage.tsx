import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../../shared/ui'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente } from '../../../clientes/clientes.types'
import type { Cliente } from '../../../clientes/clientes.types'
import { listarEquipos } from '../../../equipos/equipos.api'
import type { Equipo } from '../../../equipos/equipos.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { listarEmpleados } from '../../../empleados/empleados.api'
import { nombreEmpleado } from '../../../empleados/empleados.types'
import type { EmpleadoResumen } from '../../../empleados/empleados.types'
import { DataTable, ModuleHeader, SemanticBadge } from '../../../erp-ui'
import { LIMITE_CALIDAD, fechaManagua, managuaAhora, managuaIso, nuevaClave, validarId } from '../garantias/fechas'
import { listarGarantias } from '../garantias/garantias.api'
import type { GarantiaGerencial } from '../garantias/garantias.types'
import { cerrarCaso, crearCaso, crearCorrectiva, crearRetrabajo, listarCasos, obtenerCaso, responderCaso, resolverCaso } from './casos.api'
import type { CasoCalidad, CasoDetalle, CrearCaso, EstadoCaso, FiltrosCasos, ResponderCaso, ResolverCaso, CerrarCaso, CrearRetrabajo, CrearCorrectiva } from './casos.types'
import '../garantias/calidad.css'

type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
type EstadoCarga = 'loading' | 'ready' | 'error'
type ActionMode = 'responder' | 'resolver' | 'cerrar' | 'retrabajo' | 'correctiva'
const errMsg = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado.'
const ESTADOS: EstadoCaso[] = ['ABIERTO', 'EN_ATENCION', 'RESUELTO', 'CERRADO']
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
async function cargarGarantiasCliente(clienteId: number, activoReferencia: string) {
  const items: GarantiaGerencial[] = []; let pagina = 1; let hayMas = true
  while (hayMas) { const result = await listarGarantias({ clienteId, activoReferencia: activoReferencia || undefined, pagina, limite: LIMITE_CALIDAD }); items.push(...result.items); hayMas = result.hayMas; pagina++ }
  return items
}

export function CasosCalidadPage({ onBusyChange }: Props) {
  const [items, setItems] = useState<CasoCalidad[]>([]); const [pagina, setPagina] = useState(1); const [hayMas, setHayMas] = useState(false)
  const [q, setQ] = useState(''); const [clienteFiltro, setClienteFiltro] = useState(''); const [activoFiltro, setActivoFiltro] = useState(''); const [codigoFiltro, setCodigoFiltro] = useState(''); const [estadoFiltro, setEstadoFiltro] = useState('' as '' | EstadoCaso)
  const [carga, setCarga] = useState<EstadoCarga>('loading'); const [error, setError] = useState(''); const [revision, setRevision] = useState(0); const req = useRef(0)
  const [clientes, setClientes] = useState<Cliente[]>([]); const [clientesError, setClientesError] = useState(''); const [buscarCliente, setBuscarCliente] = useState(''); const [clientePagina, setClientePagina] = useState(1)
  const [showForm, setShowForm] = useState(false); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(''); const [success, setSuccess] = useState('')
  const [actionMode, setActionMode] = useState<ActionMode | null>(null); const [frozenVersion, setFrozenVersion] = useState<number | null>(null)
  const [actionForm, setActionForm] = useState({ fecha: managuaAhora(), resultado: 'PROCEDE' as 'PROCEDE' | 'NO_PROCEDE', causaRaiz: '', referenciaTrabajo: '', motivo: '', ordenId: '', descripcion: '', responsableId: '', venceEn: managuaAhora(), resultadoCierre: '' })
  const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([]); const [empleadosError, setEmpleadosError] = useState(''); const [buscarEmpleado, setBuscarEmpleado] = useState(''); const [empleadoPagina, setEmpleadoPagina] = useState(1)
  const [detail, setDetail] = useState<CasoDetalle | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [empleadosRevision, setEmpleadosRevision] = useState(0)
  const [form, setForm] = useState({ referencia: '', clienteId: '', activoReferencia: '', codigoFalla: '', descripcion: '', equipoId: '', ordenId: '', garantiaId: '', anteriorId: '', abiertaEn: managuaAhora(), respuestaLimiteEn: '', resolucionLimiteEn: '' })
  const [equipos, setEquipos] = useState<Equipo[]>([]); const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]); const [garantias, setGarantias] = useState<GarantiaGerencial[]>([]); const [dependientesBusy, setDependientesBusy] = useState(false); const [dependientesError, setDependientesError] = useState(''); const depReq = useRef(0)
  const [antecedentes, setAntecedentes] = useState<CasoCalidad[]>([]); const [antecedentePagina, setAntecedentePagina] = useState(1); const [antecedenteHayMas, setAntecedenteHayMas] = useState(false); const [antecedenteError, setAntecedenteError] = useState(''); const antReq = useRef(0)
  const keyRef = useRef(nuevaClave())
  const intentRef = useRef('')
  const actionKeys = useRef(new Map<string, string>())

  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; listarClientes().then((data) => { if (active) setClientes(data) }).catch((e: unknown) => { if (active) setClientesError(errMsg(e)) }) }); return () => { active = false } }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; setEmpleadosError(''); listarEmpleados().then((data) => { if (active) setEmpleados(data) }).catch((e: unknown) => { if (active) setEmpleadosError(errMsg(e)) }) }); return () => { active = false } }, [empleadosRevision])
  const load = useCallback(() => {
    const id = ++req.current; setCarga('loading'); setError('')
    queueMicrotask(() => {
      const filtros: FiltrosCasos = { q: q.trim() || undefined, clienteId: clienteFiltro ? Number(clienteFiltro) : undefined, activoReferencia: activoFiltro.trim() || undefined, codigoFalla: codigoFiltro.trim() || undefined, estado: estadoFiltro || undefined, pagina, limite: LIMITE_CALIDAD }
      listarCasos(filtros).then((data) => { if (req.current === id) { setItems(data.items); setHayMas(data.hayMas); setCarga('ready') } }).catch((e: unknown) => { if (req.current === id) { setError(errMsg(e)); setCarga('error') } })
    })
    return () => { if (req.current === id) req.current++ }
  }, [q, clienteFiltro, activoFiltro, codigoFiltro, estadoFiltro, pagina])
  useEffect(() => { let active = true; let cancel = () => {}; queueMicrotask(() => { if (active) cancel = load() ?? (() => {}) }); return () => { active = false; cancel() } }, [load, revision])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); const raw = params.get('casoId'); if (!raw || !/^\d+$/.test(raw) || !validarId(Number(raw))) return
    let active = true
    queueMicrotask(() => { if (!active) return; setDetailLoading(true); void obtenerCaso(Number(raw)).then((data) => { if (active) setDetail(data) }).catch((e: unknown) => { if (active) { setError(errMsg(e)); setCarga('error') } }).finally(() => { if (active) setDetailLoading(false) }) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true; let id = 0
    queueMicrotask(() => {
    if (!active) return
    id = ++depReq.current; setEquipos([]); setOrdenes([]); setGarantias([]); setDependientesError('')
    if ((!showForm && actionMode !== 'retrabajo') || !form.clienteId) { setDependientesBusy(false); return }
    setDependientesBusy(true)
    Promise.all([cargarEquiposCliente(form.clienteId), cargarOrdenesCliente(form.clienteId), cargarGarantiasCliente(Number(form.clienteId), form.activoReferencia.trim().toUpperCase())]).then(([eq, ord, gar]) => { if (active && depReq.current === id) { setEquipos(eq); setOrdenes(ord); setGarantias(gar); setDependientesBusy(false) } }).catch((e: unknown) => { if (active && depReq.current === id) { setDependientesError(errMsg(e)); setDependientesBusy(false) } })
    })
    return () => { active = false }
  }, [showForm, actionMode, form.clienteId, form.activoReferencia])
  useEffect(() => {
    let active = true; let id = 0
    queueMicrotask(() => {
      if (!active) return
      id = ++antReq.current; setAntecedentes([]); setAntecedenteHayMas(false); setAntecedenteError('')
      const opened = managuaIso(form.abiertaEn)
      if (!showForm || !form.clienteId || !form.activoReferencia.trim() || !form.codigoFalla.trim() || !opened) return
      void listarCasos({ clienteId: Number(form.clienteId), activoReferencia: form.activoReferencia.trim().toUpperCase(), codigoFalla: form.codigoFalla.trim().toUpperCase(), abiertaAntes: opened, pagina: antecedentePagina, limite: LIMITE_CALIDAD }).then((data) => { if (active && antReq.current === id) { setAntecedentes(data.items); setAntecedenteHayMas(data.hayMas) } }).catch((e: unknown) => { if (active && antReq.current === id) setAntecedenteError(errMsg(e)) })
    })
    return () => { active = false }
  }, [showForm, form.clienteId, form.activoReferencia, form.codigoFalla, form.abiertaEn, antecedentePagina])

  const clientesPage = useMemo(() => { const term = buscarCliente.trim().toLowerCase(); return clientes.filter((c) => !term || `${nombreCliente(c)} ${c.codigo}`.toLowerCase().includes(term)).slice((clientePagina - 1) * LIMITE_CALIDAD, clientePagina * LIMITE_CALIDAD) }, [clientes, buscarCliente, clientePagina])
  const columnas = useMemo(() => [
    { key: 'referencia', header: 'Caso', render: (r: CasoCalidad) => <button className="calidad-link" type="button" onClick={() => void openDetail(r.id)}>{r.referencia}</button> },
    { key: 'cliente', header: 'Cliente / activo', render: (r: CasoCalidad) => <>{r.clienteNombre}<small>{r.activoReferencia} · {r.codigoFalla}</small></> },
    { key: 'fecha', header: 'Apertura', render: (r: CasoCalidad) => fechaManagua(r.abiertaEn) },
    { key: 'estado', header: 'Estado', render: (r: CasoCalidad) => <SemanticBadge label={r.estado.replace('_', ' ')} variant={r.estado === 'CERRADO' ? 'neutral' : r.estado === 'RESUELTO' ? 'success' : r.estado === 'EN_ATENCION' ? 'info' : 'warning'} /> },
  ], [])
  async function openDetail(id: number) { if (!validarId(id)) return; setDetailLoading(true); try { const data = await obtenerCaso(id); setDetail(data); const u = new URL(window.location.href); u.searchParams.set('casoId', String(id)); window.history.replaceState(null, '', u) } catch (e) { setError(errMsg(e)) } finally { setDetailLoading(false) } }
  function openCreate() { setDetail(null); setFormError(''); setSuccess(''); keyRef.current = nuevaClave(); intentRef.current = ''; setAntecedentePagina(1); setForm({ referencia: '', clienteId: '', activoReferencia: '', codigoFalla: '', descripcion: '', equipoId: '', ordenId: '', garantiaId: '', anteriorId: '', abiertaEn: managuaAhora(), respuestaLimiteEn: '', resolucionLimiteEn: '' }); setShowForm(true) }
  function closeForm() { if (busy) return; setShowForm(false); setFormError('') }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setFormError(''); setSuccess('')
    const abiertaEn = managuaIso(form.abiertaEn); const respuestaLimiteEn = managuaIso(form.respuestaLimiteEn); const resolucionLimiteEn = managuaIso(form.resolucionLimiteEn)
    if (!abiertaEn || new Date(abiertaEn).getTime() > Date.now()) { setFormError('La fecha de apertura debe ser válida y no futura.'); return }
    const opened = new Date(abiertaEn).getTime(); const response = respuestaLimiteEn ? new Date(respuestaLimiteEn).getTime() : undefined; const resolution = resolucionLimiteEn ? new Date(resolucionLimiteEn).getTime() : undefined
    if (response !== undefined && (Number.isNaN(response) || response < opened)) { setFormError('El plazo de respuesta debe ser igual o posterior a la apertura.'); return }
    if (resolution !== undefined && (Number.isNaN(resolution) || resolution < opened || (response !== undefined && resolution < response))) { setFormError('El plazo de resolución debe ser igual o posterior a la apertura y al de respuesta.'); return }
    const payload: CrearCaso = { referencia: form.referencia.trim().toUpperCase(), clienteId: Number(form.clienteId), activoReferencia: form.activoReferencia.trim().toUpperCase(), codigoFalla: form.codigoFalla.trim().toUpperCase(), descripcion: form.descripcion.trim(), ...(form.equipoId ? { equipoId: Number(form.equipoId) } : {}), ...(form.ordenId ? { ordenId: Number(form.ordenId) } : {}), ...(form.garantiaId ? { garantiaId: Number(form.garantiaId) } : {}), ...(form.anteriorId ? { anteriorId: Number(form.anteriorId) } : {}), abiertaEn, ...(respuestaLimiteEn ? { respuestaLimiteEn } : {}), ...(resolucionLimiteEn ? { resolucionLimiteEn } : {}) }
    if (!validarId(payload.clienteId) || [payload.equipoId, payload.ordenId, payload.garantiaId, payload.anteriorId].some((id) => id !== undefined && !validarId(id))) { setFormError('Selecciona asociaciones válidas.'); return }
    const intent = JSON.stringify(payload); if (intentRef.current !== intent) { intentRef.current = intent; keyRef.current = nuevaClave() }
    setBusy(true); onBusyChange?.(true)
    try { const result = await crearCaso(payload, keyRef.current); keyRef.current = nuevaClave(); setDetail(result); setShowForm(false); setSuccess(`Caso ${result.referencia} registrado.`); setPagina(1); setRevision((n) => n + 1) }
    catch (e) { setFormError(e instanceof Error && 'status' in e && e.status === 409 ? 'El registro cambió o la referencia ya existe. El formulario se conserva; revisa el contexto antes de volver a intentar.' : errMsg(e)) }
    finally { setBusy(false); onBusyChange?.(false) }
  }
  function beginAction(mode: ActionMode) {
    if (!detail || busy || detail.estado === 'CERRADO') return
    setFrozenVersion(detail.version); setFormError(''); setSuccess(''); setEmpleadoPagina(1); setBuscarEmpleado('')
    setActionForm({ fecha: managuaAhora(), resultado: 'PROCEDE', causaRaiz: '', referenciaTrabajo: '', motivo: '', ordenId: '', descripcion: '', responsableId: '', venceEn: managuaAhora(), resultadoCierre: '' })
    setForm((current) => ({ ...current, clienteId: String(detail.clienteId) }))
    setActionMode(mode)
  }
  function closeActionForm() { if (busy) return; setActionMode(null); setFormError('') }
  function actionKey(action: ActionMode, id: number, payload: object): string {
    const intent = JSON.stringify({ action, id, payload })
    let key = actionKeys.current.get(intent)
    if (!key) { key = nuevaClave(); actionKeys.current.set(intent, key) }
    return key
  }
  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !detail || actionMode === null || frozenVersion === null) return
    setFormError('')
    const timestamp = managuaIso(actionForm.fecha)
    const time = timestamp ? new Date(timestamp).getTime() : Number.NaN
    const now = Date.now(); const opened = new Date(detail.abiertaEn).getTime()
    let payload: ResponderCaso | ResolverCaso | CerrarCaso | CrearRetrabajo | CrearCorrectiva
    if (actionMode === 'responder') {
      if (!timestamp || time < opened || time > now) { setFormError('La respuesta debe ocurrir desde la apertura y hasta ahora.'); return }
      payload = { version: frozenVersion, respondidaEn: timestamp }
    } else if (actionMode === 'resolver') {
      const responded = detail.respondidaEn ? new Date(detail.respondidaEn).getTime() : Number.NaN
      if (!timestamp || time < responded || time > now) { setFormError('La resolución debe ocurrir desde la respuesta y hasta ahora.'); return }
      payload = { version: frozenVersion, resueltaEn: timestamp, resultado: actionForm.resultado, causaRaiz: actionForm.causaRaiz.trim() }
    } else if (actionMode === 'cerrar') {
      const resolved = detail.resueltaEn ? new Date(detail.resueltaEn).getTime() : Number.NaN
      const milestones = [resolved, ...detail.retrabajos.map((r) => new Date(r.fechaEfectiva).getTime()), ...detail.correctivas.flatMap((c) => [new Date(c.creadaEn).getTime(), ...(c.cerradaEn ? [new Date(c.cerradaEn).getTime()] : [])])]
      const last = Math.max(...milestones)
      if (detail.correctivas.some((c) => c.cerradaEn === null)) { setFormError('Cierra todas las acciones correctivas antes de cerrar el caso.'); return }
      if (!timestamp || time < last || time > now) { setFormError('El cierre debe ser posterior a la resolución y a todos los hitos, y no puede ser futuro.'); return }
      payload = { version: frozenVersion, cerradaEn: timestamp }
    } else if (actionMode === 'retrabajo') {
      if (!timestamp || time < opened || time > now) { setFormError('El retrabajo debe ocurrir desde la apertura y hasta ahora.'); return }
      const ordenId = actionForm.ordenId ? Number(actionForm.ordenId) : undefined
      if (ordenId !== undefined && !validarId(ordenId)) { setFormError('Selecciona una orden válida.'); return }
      payload = { referenciaTrabajo: actionForm.referenciaTrabajo.trim().toUpperCase(), fechaEfectiva: timestamp, motivo: actionForm.motivo.trim(), ...(ordenId ? { ordenId } : {}) }
    } else {
      const creadaEn = timestamp; const venceEn = managuaIso(actionForm.venceEn); const due = venceEn ? new Date(venceEn).getTime() : Number.NaN
      const responsableId = Number(actionForm.responsableId)
      if (!timestamp || time < opened || time > now || !venceEn || due < time || !validarId(responsableId)) { setFormError('Revisa la creación, fecha límite y responsable de la acción correctiva.'); return }
      payload = { descripcion: actionForm.descripcion.trim(), responsableId, creadaEn, venceEn }
    }
    const key = actionKey(actionMode, detail.id, payload)
    setBusy(true); onBusyChange?.(true)
    try {
      if (actionMode === 'responder') setDetail(await responderCaso(detail.id, payload as ResponderCaso, key))
      else if (actionMode === 'resolver') setDetail(await resolverCaso(detail.id, payload as ResolverCaso, key))
      else if (actionMode === 'cerrar') setDetail(await cerrarCaso(detail.id, payload as CerrarCaso, key))
      else {
        if (actionMode === 'retrabajo') await crearRetrabajo(detail.id, payload as CrearRetrabajo, key)
        else await crearCorrectiva(detail.id, payload as CrearCorrectiva, key)
        setDetail(await obtenerCaso(detail.id))
      }
      setActionMode(null); setFrozenVersion(null); setSuccess('Los datos del caso se actualizaron.'); setRevision((n) => n + 1)
    } catch (e) { setFormError(e instanceof Error && 'status' in e && e.status === 409 ? 'Se conservan tus datos. Cancela el formulario, vuelve al listado y abre el registro de nuevo para consultar los datos actuales.' : errMsg(e)) }
    finally { setBusy(false); onBusyChange?.(false) }
  }

  return <main className="calidad-source">
    <ModuleHeader breadcrumb={<a href="/inteligencia/origen/calidad">Registros de origen de calidad</a>} title="Casos de calidad" description="Registra reclamos y consultas de garantía con trazabilidad de su contexto." action={!showForm && !detail ? <Button variant="primary" onClick={openCreate}>Nuevo caso</Button> : undefined} />
    {success && <p className="calidad-notice" role="status">{success}</p>}
    {actionMode ? <section className="calidad-panel" aria-labelledby="caso-action-title"><h2 id="caso-action-title">{actionMode === 'responder' ? 'Registrar respuesta' : actionMode === 'resolver' ? 'Resolver caso' : actionMode === 'cerrar' ? 'Cerrar caso' : actionMode === 'retrabajo' ? 'Registrar retrabajo' : 'Registrar acción correctiva'}</h2><p className="calidad-hint">Caso {detail?.referencia}. Esta acción quedará en el historial del caso.</p>{formError && <p role="alert" className="calidad-error">{formError}</p>}
      <form className="calidad-form" onSubmit={(e) => void submitAction(e)}>
        {(actionMode === 'responder' || actionMode === 'resolver' || actionMode === 'cerrar') && <label>{actionMode === 'responder' ? 'Fecha de respuesta' : actionMode === 'resolver' ? 'Fecha de resolución' : 'Fecha de cierre'}<input type="datetime-local" required value={actionForm.fecha} disabled={busy} max={managuaAhora()} onChange={(e) => setActionForm({ ...actionForm, fecha: e.target.value })} /></label>}
        {actionMode === 'resolver' && <><label>Resultado<select value={actionForm.resultado} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, resultado: e.target.value as 'PROCEDE' | 'NO_PROCEDE' })}><option value="PROCEDE">Procede</option><option value="NO_PROCEDE">No procede</option></select></label><label className="calidad-wide">Causa raíz<textarea required maxLength={2000} value={actionForm.causaRaiz} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, causaRaiz: e.target.value })} /></label></>}
        {actionMode === 'retrabajo' && <><label>Referencia del trabajo<input required maxLength={100} value={actionForm.referenciaTrabajo} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, referenciaTrabajo: e.target.value.toUpperCase() })} /></label><label>Fecha efectiva<input type="datetime-local" required value={actionForm.fecha} disabled={busy} max={managuaAhora()} onChange={(e) => setActionForm({ ...actionForm, fecha: e.target.value })} /></label><label className="calidad-wide">Motivo<textarea required maxLength={2000} value={actionForm.motivo} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, motivo: e.target.value })} /></label><label>Orden relacionada con el retrabajo (opcional)<select value={actionForm.ordenId} disabled={busy || dependientesBusy} onChange={(e) => setActionForm({ ...actionForm, ordenId: e.target.value })}><option value="">Sin orden asociada</option>{ordenes.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.estadoCodigo}</option>)}</select>{dependientesError && <small role="alert">No se pudieron cargar órdenes: {dependientesError}</small>}</label></>}
        {actionMode === 'correctiva' && <><label className="calidad-wide">Descripción<textarea required maxLength={2000} value={actionForm.descripcion} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, descripcion: e.target.value })} /></label><label>Responsable<select required value={actionForm.responsableId} disabled={busy || !!empleadosError} onChange={(e) => setActionForm({ ...actionForm, responsableId: e.target.value })}><option value="">Selecciona empleado activo</option>{empleados.filter((emp) => emp.active && `${nombreEmpleado(emp)} ${emp.codEmpleado}`.toLowerCase().includes(buscarEmpleado.toLowerCase())).slice((empleadoPagina - 1) * LIMITE_CALIDAD, empleadoPagina * LIMITE_CALIDAD).map((emp) => <option key={emp.id} value={emp.id}>{nombreEmpleado(emp)} · {emp.codEmpleado}</option>)}</select><input aria-label="Buscar responsable" placeholder="Buscar empleado" value={buscarEmpleado} disabled={busy} onChange={(e) => { setBuscarEmpleado(e.target.value); setEmpleadoPagina(1) }} /><span className="calidad-inline"><button type="button" disabled={busy || empleadoPagina <= 1} onClick={() => setEmpleadoPagina((n) => n - 1)}>Empleados anteriores</button><button type="button" disabled={busy || empleadoPagina * LIMITE_CALIDAD >= empleados.filter((emp) => emp.active && `${nombreEmpleado(emp)} ${emp.codEmpleado}`.toLowerCase().includes(buscarEmpleado.toLowerCase())).length} onClick={() => setEmpleadoPagina((n) => n + 1)}>Más empleados</button></span>{empleadosError && <small role="alert">No se pudieron cargar empleados: {empleadosError} <button type="button" disabled={busy} onClick={() => setEmpleadosRevision((n) => n + 1)}>Reintentar</button></small>}</label><label>Creada<input type="datetime-local" required value={actionForm.fecha} disabled={busy} max={managuaAhora()} onChange={(e) => setActionForm({ ...actionForm, fecha: e.target.value })} /></label><label>Fecha límite<input type="datetime-local" required value={actionForm.venceEn} disabled={busy} onChange={(e) => setActionForm({ ...actionForm, venceEn: e.target.value })} /></label></>}
        <div className="calidad-actions calidad-wide"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={closeActionForm}>Cancelar</Button></div>
      </form>
    </section> : showForm ? <section className="calidad-panel"><h2>Nuevo caso</h2><p className="calidad-hint">La garantía asociada es una referencia documental y no determina por sí sola si el reclamo procede.</p>{formError && <p role="alert" className="calidad-error">{formError}</p>}{clientesError && <p role="alert" className="calidad-error">No se pudieron cargar clientes: {clientesError}</p>}
      <form className="calidad-form" onSubmit={(e) => void submit(e)}>
        <label>Referencia<input required maxLength={100} value={form.referencia} disabled={busy} onChange={(e) => setForm({ ...form, referencia: e.target.value })} /></label>
        <label>Cliente<select required value={form.clienteId} disabled={busy || !!clientesError} onChange={(e) => { setForm({ ...form, clienteId: e.target.value, activoReferencia: '', codigoFalla: '', equipoId: '', ordenId: '', garantiaId: '', anteriorId: '' }); setAntecedentePagina(1) }}><option value="">Selecciona cliente</option>{clientesPage.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c)}{c.activo ? '' : ' (inactivo)'}</option>)}</select><input aria-label="Buscar cliente" placeholder="Filtrar cliente" value={buscarCliente} disabled={busy} onChange={(e) => { setBuscarCliente(e.target.value); setClientePagina(1) }} /><span className="calidad-inline"><button type="button" disabled={busy || clientePagina <= 1} onClick={() => setClientePagina((n) => n - 1)}>Clientes anteriores</button><button type="button" disabled={busy || clientePagina * LIMITE_CALIDAD >= clientes.filter((c) => !buscarCliente || `${nombreCliente(c)} ${c.codigo}`.toLowerCase().includes(buscarCliente.toLowerCase())).length} onClick={() => setClientePagina((n) => n + 1)}>Más clientes</button></span></label>
        <label>Referencia del activo<input required maxLength={100} value={form.activoReferencia} disabled={busy || !form.clienteId} onChange={(e) => { setForm({ ...form, activoReferencia: e.target.value.toUpperCase(), equipoId: '', ordenId: '', garantiaId: '', anteriorId: '' }); setAntecedentePagina(1) }} /><small>Clave estable elegida por el equipo; no se infiere del nombre del equipo.</small></label>
        <label>Código de falla<input required maxLength={60} value={form.codigoFalla} disabled={busy} onChange={(e) => { setForm({ ...form, codigoFalla: e.target.value.toUpperCase(), anteriorId: '' }); setAntecedentePagina(1) }} /></label>
        <label className="calidad-wide">Descripción<textarea required maxLength={2000} rows={4} value={form.descripcion} disabled={busy} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
        <label>Apertura<input type="datetime-local" required value={form.abiertaEn} disabled={busy} max={managuaAhora()} onChange={(e) => { setForm({ ...form, abiertaEn: e.target.value, anteriorId: '' }); setAntecedentePagina(1) }} /></label>
        <label>Plazo de respuesta (opcional)<input type="datetime-local" value={form.respuestaLimiteEn} disabled={busy} onChange={(e) => setForm({ ...form, respuestaLimiteEn: e.target.value })} /></label>
        <label>Plazo de resolución (opcional)<input type="datetime-local" value={form.resolucionLimiteEn} disabled={busy} onChange={(e) => setForm({ ...form, resolucionLimiteEn: e.target.value })} /></label>
        <label>Equipo relacionado (opcional)<select value={form.equipoId} disabled={busy || !form.clienteId || dependientesBusy} onChange={(e) => setForm({ ...form, equipoId: e.target.value })}><option value="">Sin equipo asociado</option>{equipos.map((e) => <option key={e.id} value={e.id}>{e.codigo} · {e.tipo} {e.numeroSerie ? `· ${e.numeroSerie}` : ''}{e.activo ? '' : ' (inactivo)'}</option>)}</select></label>
        <label>Orden relacionada (opcional)<select value={form.ordenId} disabled={busy || !form.clienteId || dependientesBusy} onChange={(e) => setForm({ ...form, ordenId: e.target.value })}><option value="">Sin orden asociada</option>{ordenes.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.estadoCodigo}</option>)}</select></label>
        <label>Garantía relacionada (opcional)<select value={form.garantiaId} disabled={busy || !form.clienteId || dependientesBusy} onChange={(e) => setForm({ ...form, garantiaId: e.target.value })}><option value="">Sin garantía asociada</option>{garantias.map((g) => <option key={g.id} value={g.id}>{g.referencia} · {g.activoReferencia} · {g.estado}</option>)}</select></label>
        <label>Caso anterior (opcional)<select value={form.anteriorId} disabled={busy || !form.clienteId || !form.activoReferencia || !form.codigoFalla || !form.abiertaEn} onChange={(e) => setForm({ ...form, anteriorId: e.target.value })}><option value="">Sin antecedente</option>{antecedentes.map((c) => <option key={c.id} value={c.id}>{c.referencia} · {fechaManagua(c.abiertaEn)}</option>)}</select><span className="calidad-inline"><button type="button" disabled={busy || antecedentePagina <= 1} onClick={() => setAntecedentePagina((n) => n - 1)}>Anteriores</button><button type="button" disabled={busy || !antecedenteHayMas} onClick={() => setAntecedentePagina((n) => n + 1)}>Más</button></span>{antecedenteError && <small role="alert">No se pudieron cargar antecedentes: {antecedenteError}</small>}</label>
        {dependientesError && <p className="calidad-error" role="alert">No se pudieron cargar equipo, orden y garantía: {dependientesError}</p>}
        <div className="calidad-actions calidad-wide"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar caso'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={closeForm}>Cancelar</Button></div>
      </form>
    </section> : detail ? <section className="calidad-panel"><div className="calidad-detail-head"><div><h2>{detail.referencia}</h2><SemanticBadge label={detail.estado.replace('_', ' ')} variant={detail.estado === 'CERRADO' ? 'neutral' : detail.estado === 'RESUELTO' ? 'success' : detail.estado === 'EN_ATENCION' ? 'info' : 'warning'} /></div><Button variant="secondary" onClick={() => { setDetail(null); const u = new URL(window.location.href); u.searchParams.delete('casoId'); window.history.replaceState(null, '', u) }}>Volver al listado</Button></div>{detailLoading && <p role="status">Actualizando detalle…</p>}<dl className="calidad-dl">{[['Cliente', detail.clienteNombre], ['Activo', detail.activoReferencia], ['Código de falla', detail.codigoFalla], ['Descripción', detail.descripcion], ['Apertura', fechaManagua(detail.abiertaEn)], ['Plazo de respuesta', detail.respuestaLimiteEn ? fechaManagua(detail.respuestaLimiteEn) : 'Sin plazo'], ['Plazo de resolución', detail.resolucionLimiteEn ? fechaManagua(detail.resolucionLimiteEn) : 'Sin plazo'], ['Respondida', detail.respondidaEn ? fechaManagua(detail.respondidaEn) : 'Pendiente'], ['Resuelta', detail.resueltaEn ? fechaManagua(detail.resueltaEn) : 'Pendiente'], ['Cerrada', detail.cerradaEn ? fechaManagua(detail.cerradaEn) : 'Pendiente'], ['Resultado', detail.resultado ?? 'Pendiente'], ['Causa raíz', detail.causaRaiz ?? 'Sin registrar'], ['Garantía', detail.garantiaReferencia ?? 'Sin asociar'], ['Caso anterior', detail.anteriorId ? `Caso #${detail.anteriorId}` : 'Sin antecedente'], ['Equipo relacionado', detail.equipoId ? `Equipo #${detail.equipoId}` : 'Sin equipo'], ['Orden relacionada al reclamo', detail.ordenId ? `Orden #${detail.ordenId}` : 'Sin orden'], ['Registrado', fechaManagua(detail.registradaEn)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {detail.estado !== 'CERRADO' && <section className="calidad-actions" aria-label="Acciones del caso">{detail.estado === 'ABIERTO' && <Button variant="primary" disabled={busy} onClick={() => beginAction('responder')}>Registrar respuesta</Button>}{detail.estado === 'EN_ATENCION' && <Button variant="primary" disabled={busy} onClick={() => beginAction('resolver')}>Resolver caso</Button>}{detail.estado === 'RESUELTO' && <Button variant="primary" disabled={busy} onClick={() => beginAction('cerrar')}>Cerrar caso</Button>}<Button variant="secondary" disabled={busy} onClick={() => beginAction('retrabajo')}>Registrar retrabajo</Button><Button variant="secondary" disabled={busy} onClick={() => beginAction('correctiva')}>Registrar acción correctiva</Button></section>}
      <section className="calidad-events"><h3>Retrabajos</h3>{detail.retrabajos.length ? <ul>{detail.retrabajos.map((r) => <li key={r.id}><strong>{r.referenciaTrabajo}</strong> · {fechaManagua(r.fechaEfectiva)} · {r.motivo}{r.ordenId ? ` · Orden #${r.ordenId}` : ''}</li>)}</ul> : <p>No hay retrabajos registrados.</p>}</section>
      <section className="calidad-events"><h3>Acciones correctivas</h3>{detail.correctivas.length ? <ul>{detail.correctivas.map((c) => <li key={c.id}><strong>{c.descripcion}</strong> · Responsable: {c.responsableNombre} · Vence {fechaManagua(c.venceEn)} · {c.cerradaEn ? `Cerrada ${fechaManagua(c.cerradaEn)}: ${c.resultado}` : 'Abierta'}</li>)}</ul> : <p>No hay acciones correctivas registradas.</p>}<a href="/inteligencia/origen/calidad?tab=correctivas">Ver acciones correctivas</a></section>
    </section> : <>
      <section className="calidad-filters" aria-label="Filtros de casos"><label>Buscar<input value={q} placeholder="Referencia, activo o código de falla" onChange={(e) => { setQ(e.target.value); setPagina(1) }} /></label><label>Cliente<select value={clienteFiltro} onChange={(e) => { setClienteFiltro(e.target.value); setPagina(1) }}><option value="">Todos los clientes</option>{clientes.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c)}{c.activo ? '' : ' (inactivo)'}</option>)}</select></label><label>Activo<input value={activoFiltro} onChange={(e) => { setActivoFiltro(e.target.value); setPagina(1) }} /></label><label>Código de falla<input value={codigoFiltro} onChange={(e) => { setCodigoFiltro(e.target.value); setPagina(1) }} /></label><label>Estado<select value={estadoFiltro} onChange={(e) => { setEstadoFiltro(e.target.value as '' | EstadoCaso); setPagina(1) }}><option value="">Todos los estados</option>{ESTADOS.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></label></section>
      <DataTable columns={columnas} rows={items} getRowKey={(r) => r.id} pagination={{ pagina, limite: LIMITE_CALIDAD, hayMas, onPageChange: setPagina, label: 'Páginas de casos de calidad' }} state={carga} error={{ description: error }} onRetry={() => setRevision((n) => n + 1)} emptyTitle="No hay casos para estos filtros" emptyDescription="Registra un caso o ajusta los filtros." />
    </>}
  </main>
}
