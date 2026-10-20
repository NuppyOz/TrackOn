import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../../shared/ui'
import { listarEmpleados } from '../../../empleados/empleados.api'
import { nombreEmpleado } from '../../../empleados/empleados.types'
import type { EmpleadoResumen } from '../../../empleados/empleados.types'
import { DataTable, ModuleHeader, SemanticBadge } from '../../../erp-ui'
import { LIMITE_CALIDAD, fechaManagua, managuaAhora, managuaIso, nuevaClave, validarId } from '../garantias/fechas'
import { cerrarCorrectiva, listarCorrectivas, obtenerCorrectiva } from './correctivas.api'
import type { CorrectivaGerencial, EstadoCorrectiva, FiltrosCorrectivas } from './correctivas.types'
import '../garantias/calidad.css'

type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
type EstadoCarga = 'loading' | 'ready' | 'error'
const errMsg = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado.'

export function CorrectivasGerencialesPage({ onBusyChange }: Props) {
  const [items, setItems] = useState<CorrectivaGerencial[]>([]); const [pagina, setPagina] = useState(1); const [hayMas, setHayMas] = useState(false)
  const [q, setQ] = useState(''); const [responsable, setResponsable] = useState(''); const [estadoFiltro, setEstadoFiltro] = useState<EstadoCorrectiva>('abiertas')
  const [carga, setCarga] = useState<EstadoCarga>('loading'); const [error, setError] = useState(''); const [revision, setRevision] = useState(0); const req = useRef(0)
  const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([]); const [empleadosError, setEmpleadosError] = useState(''); const [empleadosRevision, setEmpleadosRevision] = useState(0)
  const [detail, setDetail] = useState<CorrectivaGerencial | null>(null); const [detailLoading, setDetailLoading] = useState(false)
  const [closing, setClosing] = useState(false); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(''); const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ fecha: managuaAhora(), resultado: '' }); const [frozenVersion, setFrozenVersion] = useState<number | null>(null)
  const keys = useRef(new Map<string, string>())

  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; setEmpleadosError(''); listarEmpleados().then((data) => { if (active) setEmpleados(data) }).catch((e: unknown) => { if (active) setEmpleadosError(errMsg(e)) }) }); return () => { active = false } }, [empleadosRevision])
  const load = useCallback(() => {
    const id = ++req.current; setCarga('loading'); setError('')
    queueMicrotask(() => {
      const filters: FiltrosCorrectivas = { q: q.trim() || undefined, responsable: responsable ? Number(responsable) : undefined, estado: estadoFiltro, pagina, limite: LIMITE_CALIDAD }
      listarCorrectivas(filters).then((data) => { if (req.current === id) { setItems(data.items); setHayMas(data.hayMas); setCarga('ready') } }).catch((e: unknown) => { if (req.current === id) { setError(errMsg(e)); setCarga('error') } })
    })
    return () => { if (req.current === id) req.current++ }
  }, [q, responsable, estadoFiltro, pagina])
  useEffect(() => { let active = true; let cancel = () => {}; queueMicrotask(() => { if (active) cancel = load() ?? (() => {}) }); return () => { active = false; cancel() } }, [load, revision])
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('correctivaId')
    if (!raw || !/^\d+$/.test(raw) || !validarId(Number(raw))) return
    let active = true
    queueMicrotask(() => { if (!active) return; setDetailLoading(true); void obtenerCorrectiva(Number(raw)).then((data) => { if (active) setDetail(data) }).catch((e: unknown) => { if (active) { setError(errMsg(e)); setCarga('error') } }).finally(() => { if (active) setDetailLoading(false) }) })
    return () => { active = false }
  }, [])
  const columns = useMemo(() => [
    { key: 'caso', header: 'Caso', render: (row: CorrectivaGerencial) => <a href={`/inteligencia/origen/calidad?casoId=${row.casoId}`}>{row.casoReferencia}</a> },
    { key: 'descripcion', header: 'Acción correctiva', render: (row: CorrectivaGerencial) => <button className="calidad-link" type="button" onClick={() => void openDetail(row.id)}>{row.descripcion}</button> },
    { key: 'responsable', header: 'Responsable', render: (row: CorrectivaGerencial) => <>{row.responsableNombre}<small>Empleado #{row.responsableId}</small></> },
    { key: 'vence', header: 'Fecha límite', render: (row: CorrectivaGerencial) => fechaManagua(row.venceEn) },
    { key: 'estado', header: 'Estado', render: (row: CorrectivaGerencial) => <SemanticBadge label={row.cerradaEn ? 'Cerrada' : 'Abierta'} variant={row.cerradaEn ? 'success' : 'warning'} /> },
  ], [])
  async function openDetail(id: number) { if (!validarId(id)) return; setDetailLoading(true); try { const data = await obtenerCorrectiva(id); setDetail(data); const u = new URL(window.location.href); u.searchParams.set('correctivaId', String(id)); window.history.replaceState(null, '', u) } catch (e) { setError(errMsg(e)) } finally { setDetailLoading(false) } }
  function beginClose() { if (!detail || detail.cerradaEn || busy) return; setFrozenVersion(detail.version); setForm({ fecha: managuaAhora(), resultado: '' }); setFormError(''); setClosing(true) }
  function cancelClose() { if (busy) return; setClosing(false); setFormError('') }
  async function submitClose(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !detail || frozenVersion === null) return
    setFormError('')
    const cerradaEn = managuaIso(form.fecha)
    const time = cerradaEn ? new Date(cerradaEn).getTime() : Number.NaN
    if (!cerradaEn || time < new Date(detail.creadaEn).getTime() || time > Date.now() || !form.resultado.trim()) { setFormError('El cierre debe ocurrir desde la creación y hasta ahora, con un resultado registrado.'); return }
    const payload = { version: frozenVersion, cerradaEn, resultado: form.resultado.trim() }
    const intent = JSON.stringify({ id: detail.id, ...payload }); let key = keys.current.get(intent); if (!key) { key = nuevaClave(); keys.current.set(intent, key) }
    setBusy(true); onBusyChange?.(true)
    try { const updated = await cerrarCorrectiva(detail.id, payload, key); setDetail(updated); setClosing(false); setFrozenVersion(null); setSuccess('La acción correctiva quedó cerrada.'); setRevision((n) => n + 1) }
    catch (e) { setFormError(e instanceof Error && 'status' in e && e.status === 409 ? 'Se conservan tus datos. Cancela el formulario, vuelve al listado y abre el registro de nuevo para consultar los datos actuales.' : errMsg(e)) }
    finally { setBusy(false); onBusyChange?.(false) }
  }

  return <main className="calidad-source">
    <ModuleHeader breadcrumb={<a href="/inteligencia/origen/calidad">Registros de origen de calidad</a>} title="Acciones correctivas" description="Da seguimiento a responsables, plazos y cierres de las acciones." />
    {success && <p className="calidad-notice" role="status">{success}</p>}
    {closing && detail ? <section className="calidad-panel"><h2>Cerrar acción correctiva</h2><p className="calidad-hint">{detail.casoReferencia} · {detail.descripcion}</p>{formError && <p className="calidad-error" role="alert">{formError}</p>}<form className="calidad-form" onSubmit={(e) => void submitClose(e)}><label>Fecha de cierre<input type="datetime-local" required max={managuaAhora()} value={form.fecha} disabled={busy} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label><label className="calidad-wide">Resultado del cierre<textarea required maxLength={2000} value={form.resultado} disabled={busy} onChange={(e) => setForm({ ...form, resultado: e.target.value })} /></label><div className="calidad-actions calidad-wide"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cierre'}</Button><Button variant="secondary" type="button" disabled={busy} onClick={cancelClose}>Cancelar</Button></div></form></section> : detail ? <section className="calidad-panel"><div className="calidad-detail-head"><div><h2>{detail.descripcion}</h2><SemanticBadge label={detail.cerradaEn ? 'Cerrada' : 'Abierta'} variant={detail.cerradaEn ? 'success' : 'warning'} /></div><Button variant="secondary" onClick={() => { setDetail(null); const u = new URL(window.location.href); u.searchParams.delete('correctivaId'); window.history.replaceState(null, '', u) }}>Volver al listado</Button></div>{detailLoading && <p role="status">Actualizando datos…</p>}<dl className="calidad-dl">{[['Caso', detail.casoReferencia], ['Responsable', detail.responsableNombre], ['Creada', fechaManagua(detail.creadaEn)], ['Fecha límite', fechaManagua(detail.venceEn)], ['Cerrada', detail.cerradaEn ? fechaManagua(detail.cerradaEn) : 'Pendiente'], ['Resultado', detail.resultado ?? 'Pendiente']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><a href={`/inteligencia/origen/calidad?casoId=${detail.casoId}`}>Abrir caso {detail.casoReferencia}</a>{!detail.cerradaEn && <div className="calidad-actions"><Button variant="primary" disabled={busy} onClick={beginClose}>Cerrar acción</Button></div>}</section> : <>
      {empleadosError && <p className="calidad-error" role="alert">No se pudieron cargar los responsables: {empleadosError} <Button type="button" onClick={() => setEmpleadosRevision((n) => n + 1)}>Reintentar</Button></p>}
      <section className="calidad-filters" aria-label="Filtros de acciones correctivas"><label>Buscar caso o descripción<input value={q} onChange={(e) => { setQ(e.target.value); setPagina(1) }} /></label><label>Responsable<select value={responsable} onChange={(e) => { setResponsable(e.target.value); setPagina(1) }}><option value="">Todos</option>{empleados.map((emp) => <option key={emp.id} value={emp.id}>{nombreEmpleado(emp)}{emp.active ? '' : ' (inactivo)'}</option>)}</select></label><label>Estado<select value={estadoFiltro} onChange={(e) => { setEstadoFiltro(e.target.value as EstadoCorrectiva); setPagina(1) }}><option value="abiertas">Abiertas</option><option value="cerradas">Cerradas</option><option value="todas">Todas</option></select></label></section>
      <DataTable columns={columns} rows={items} getRowKey={(row) => row.id} pagination={{ pagina, limite: LIMITE_CALIDAD, hayMas, onPageChange: setPagina, label: 'Páginas de acciones correctivas' }} state={carga} error={{ description: error }} onRetry={() => setRevision((n) => n + 1)} emptyTitle="No hay acciones correctivas" emptyDescription="Ajusta los filtros o registra una acción desde el detalle de un caso." />
    </>}
  </main>
}
