import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { ActionMenu, Button } from '../../../shared/ui'
import { DataTable, type DataTableColumn, type SortDirection } from '../../erp-ui/components'
import { agregarNotaCotizacion, actualizarCotizacion, crearCotizacion, decidirCotizacion, enviarCotizacion, listarCotizaciones, obtenerCotizacion } from './cotizaciones.api'
import { CotizacionDetalle } from './CotizacionDetalle'
import { EstadoCotizacionBadge } from './EstadoCotizacionBadge'
import { CotizacionForm } from './CotizacionForm'
import type { Cotizacion, CotizacionDecision, CotizacionDraft, CotizacionPatch, CotizacionResumen } from './cotizaciones.types'
import './cotizaciones.css'

const LIMITE = 25
const money = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return `C$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}
const date = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(parsed)
}
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const uuid = () => crypto.randomUUID()

export function CotizacionesPage() {
  const [rows, setRows] = useState<CotizacionResumen[]>([])
  const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false)
  const [q, setQ] = useState(''); const [estado, setEstado] = useState(''); const [clienteId, setClienteId] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'venceEn'>('id'); const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [clients, setClients] = useState<Cliente[]>([])
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list'); const [detail, setDetail] = useState<Cotizacion | null>(null); const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false); const requestId = useRef(0); const idempotency = useRef<{ signature: string; key: string } | null>(null)
  const runIdempotent = async <T,>(operation: string, id: number | null, payload: unknown, send: (key: string) => Promise<T>) => {
    const signature = JSON.stringify([operation, id, payload])
    if (idempotency.current?.signature !== signature) idempotency.current = { signature, key: uuid() }
    const result = await send(idempotency.current.key)
    idempotency.current = null
    return result
  }
  const load = useCallback(async (requestedPage = page) => {
    const request = ++requestId.current; setLoading(true); setError('')
    try {
      const result = await listarCotizaciones({ q: q.trim().slice(0, 100) || undefined, estado: estado || undefined, clienteId: clienteId ? Number(clienteId) : undefined, pagina: requestedPage, limite: LIMITE, sortBy, sortDir })
      if (request !== requestId.current) return
      setRows(result.items); setPage(result.pagina); setHasMore(result.hayMas)
    } catch (cause) { if (request === requestId.current) setError(message(cause)) }
    finally { if (request === requestId.current) setLoading(false) }
  }, [page, q, estado, clienteId, sortBy, sortDir])
  useEffect(() => {
    let live = true
    queueMicrotask(() => { if (live) void load() })
    return () => { live = false; requestId.current += 1 }
  }, [load])
  useEffect(() => { let live = true; listarClientes().then(value => { if (live) setClients(value) }).catch(cause => { if (live) setError(message(cause)) }); return () => { live = false } }, [])

  const resetIntent = () => { idempotency.current = null }
  const startNew = () => { resetIntent(); setDetail(null); setEditing(false); setNotice(''); setView('new') }
  const open = async (id: number, edit = false) => {
    setBusy(true); setError('')
    try {
      const quote = await obtenerCotizacion(id)
      setDetail(quote); setEditing(edit && quote.accionesPermitidas.editar); setView('detail'); setNotice('')
    } catch (cause) { setError(message(cause)); setEditing(false) }
    finally { setBusy(false) }
  }
  const save = async (value: CotizacionDraft | CotizacionPatch) => {
    if (lock.current || busy) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (editing && detail && 'version' in value) {
        const updated = await actualizarCotizacion(detail.id, value)
        setDetail(updated); setEditing(false); setNotice('Borrador actualizado. Las líneas se conservaron salvo que solicitaste reemplazarlas.')
      } else {
        const created = await runIdempotent('cotizacion:crear', null, value, key => crearCotizacion(value as CotizacionDraft, key))
        setDetail(created); setView('detail'); setNotice('Borrador creado. Los precios y totales los calculó el servidor.')
      }
      resetIntent(); await load(1)
    } catch (cause) { setError(message(cause)) }
    finally { lock.current = false; setBusy(false) }
  }
  const transition = async (operation: 'enviar' | 'decision', decision?: 'APROBADA' | 'RECHAZADA') => {
    if (!detail || lock.current || busy) return
    const confirmed = operation === 'enviar'
      ? window.confirm(`¿Enviar la cotización C-${detail.id} a ${detail.clienteNombreRegistrado}? Sus precios quedarán congelados.`)
      : window.confirm(`¿${decision === 'APROBADA' ? 'Aprobar' : 'Rechazar'} la cotización C-${detail.id}? La decisión quedará registrada.`)
    if (!confirmed) return
    const body: CotizacionDecision = { version: detail.version, decision: decision ?? 'APROBADA' }
    const payload = operation === 'enviar' ? { version: detail.version } : body
    lock.current = true; setBusy(true); setError('')
    try {
      const updated = operation === 'enviar'
        ? await runIdempotent(`cotizacion:enviar:${detail.id}`, detail.id, payload, key => enviarCotizacion(detail.id, detail.version, key))
        : await runIdempotent(`cotizacion:decision:${detail.id}`, detail.id, payload, key => decidirCotizacion(detail.id, body, key))
      setDetail(updated); resetIntent(); setNotice(operation === 'enviar' ? 'Cotización enviada.' : `Cotización ${decision === 'APROBADA' ? 'aprobada' : 'rechazada'}.`); await load(1)
    } catch (cause) {
      setError(message(cause))
      try { setDetail(await obtenerCotizacion(detail.id)) } catch { /* conservar el detalle y el error para permitir reintento */ }
    } finally { lock.current = false; setBusy(false) }
  }
  const addNote = async (text: string): Promise<boolean> => {
    if (!detail || lock.current || busy) return false
    const normalized = text.trim()
    if (!normalized || normalized.length > 2000) return false
    lock.current = true; setBusy(true); setError('')
    try {
      const updated = await runIdempotent(`cotizacion:nota:${detail.id}`, detail.id, { texto: normalized }, key => agregarNotaCotizacion(detail.id, normalized, key))
      setDetail(updated); resetIntent(); setNotice('Nota interna agregada.'); return true
    } catch (cause) { setError(message(cause)); return false }
    finally { lock.current = false; setBusy(false) }
  }
  const columns: DataTableColumn<CotizacionResumen>[] = [
    { key: 'id', header: 'Cotización', render: row => <button className="cotizaciones__link" disabled={busy} onClick={() => void open(row.id)}>C-{row.id}</button>, sortable: true },
    { key: 'cliente', header: 'Cliente', render: row => row.clienteNombreRegistrado },
    { key: 'estado', header: 'Estado', render: row => <EstadoCotizacionBadge estado={row.estadoEfectivo} /> },
    { key: 'venceEn', header: 'Vence', render: row => date(row.venceEn), sortable: true },
    { key: 'total', header: 'Total', render: row => money(row.total), align: 'end' },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones C-${row.id}`}><button type="button" disabled={busy} onClick={() => void open(row.id)}>Ver detalle</button>{row.accionesPermitidas.editar && <button type="button" disabled={busy} onClick={() => void open(row.id, true)}>Editar borrador</button>}</ActionMenu> },
  ]
  const sortKey = sortBy === 'id' ? 'id' : 'venceEn'
  const changeSort = (key: string, direction: SortDirection) => {
    if (key !== 'id' && key !== 'venceEn') return
    setSortBy(key); setSortDir(direction); setPage(1)
  }
  const form = view === 'new' || editing
  let content: ReactNode
  if (view === 'list') {
    content = <>
      <div className="cotizaciones__filters"><label>Estado <select aria-label="Filtrar por estado" value={estado} onChange={event => { setEstado(event.target.value); setPage(1) }}><option value="">Todos</option>{['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'].map(value => <option key={value}>{value}</option>)}</select></label><label>Cliente <select aria-label="Filtrar por cliente" value={clienteId} onChange={event => { setClienteId(event.target.value); setPage(1) }}><option value="">Todos los clientes</option>{clients.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label></div>
      <DataTable columns={columns} rows={rows} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar', placeholder: 'Cliente o cotización' }} sort={{ key: sortKey, direction: sortDir, onChange: changeSort }} pagination={{ pagina: page, limite: LIMITE, hayMas: hasMore, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay cotizaciones" emptyDescription="Crea un borrador para comenzar." />
    </>
  } else if (form) {
    content = <CotizacionForm quote={editing ? detail : null} clients={clients} busy={busy} onSave={save} onCancel={() => { resetIntent(); setEditing(false); if (view === 'new') setView('list') }} />
  } else if (detail) {
    content = <CotizacionDetalle quote={detail} busy={busy} onEdit={() => setEditing(true)} onSend={() => void transition('enviar')} onDecision={decision => void transition('decision', decision)} onNote={addNote} onBack={() => { resetIntent(); setView('list'); setDetail(null); setNotice('') }} />
  } else content = <p role="status">Selecciona una cotización.</p>

  return <div className="comercial-scope cotizaciones"><header className="cotizaciones__header"><div><p>Comercial / Cotizaciones y ventas</p><h1>Cotizaciones</h1><span>Gestiona borradores, envíos y decisiones comerciales.</span></div>{view === 'list' && <Button variant="primary" disabled={busy} onClick={startNew}>Nueva cotización</Button>}</header>
    {notice && <div role="status" className="cotizaciones__notice">{notice}</div>}{error && <p role="alert" className="cotizaciones__error">{error}</p>}{content}
  </div>
}
