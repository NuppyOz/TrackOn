import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { AccionesFila, Button, IconButton } from '../../../shared/ui'
import { EyeIcon, PencilSimpleIcon, ReceiptIcon, ShoppingCartIcon } from '@phosphor-icons/react'
import { DataTable, ModuleHeader, type DataTableColumn, type SortDirection } from '../../erp-ui/components'
import { agregarNotaCotizacion, actualizarCotizacion, crearCotizacion, decidirCotizacion, enviarCotizacion, listarCotizaciones, obtenerCotizacion } from './cotizaciones.api'
import { CotizacionDetalle } from './CotizacionDetalle'
import { EstadoCotizacionBadge } from './EstadoCotizacionBadge'
import { CotizacionForm } from './CotizacionForm'
import type { Cotizacion, CotizacionDecision, CotizacionDraft, CotizacionPatch, CotizacionResumen } from './cotizaciones.types'
import { convertirCotizacionEnVenta } from '../ventas/ventas.api'
import { VentasPage } from '../ventas/VentasPage'
import type { VentaResumen } from '../ventas/ventas.types'
import { OportunidadesPage } from '../oportunidades/OportunidadesPage'
import type { Oportunidad } from '../oportunidades/oportunidades.api'
import { irA, RUTAS } from '../../../shared/navigation'
import './cotizaciones.css'

const LIMITE = 10
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
function idInicial(parametro: string) {
  const value = new URLSearchParams(window.location.search).get(parametro)
  return value && /^[1-9]\d*$/.test(value) && Number(value) <= 2_147_483_647 ? Number(value) : null
}

type SeccionVentas = 'oportunidades' | 'cotizaciones' | 'ventas'
const rutaSeccion: Record<SeccionVentas, string> = { oportunidades: RUTAS.comercial['ventas-oportunidades'], cotizaciones: RUTAS.comercial['ventas-cotizaciones'], ventas: RUTAS.comercial['ventas-registradas'] }

const migas = (actual: string) => [{ label: 'Comercial', ruta: RUTAS.comercial.inicio }, { label: 'Gestión de ventas', ruta: RUTAS.comercial.ventas }, { label: actual }]

export function CotizacionesPage({ seccion }: Readonly<{ seccion?: SeccionVentas }> = {}) {
  const [rows, setRows] = useState<CotizacionResumen[]>([])
  const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false); const [total, setTotal] = useState<number>()
  const [q, setQ] = useState(''); const [estado, setEstado] = useState(''); const [clienteId, setClienteId] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'venceEn'>('id'); const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [clients, setClients] = useState<Cliente[]>([])
  const [view, setView] = useState<'list' | 'new' | 'detail'>(() => idInicial('oportunidadId') ? 'new' : 'list'); const [detail, setDetail] = useState<Cotizacion | null>(null); const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sectionTab, setSectionTabState] = useState<SeccionVentas>(() => seccion ?? (idInicial('ventaId') ? 'ventas' : 'cotizaciones'))
  // Mantiene la URL (y el sidebar) alineados con la sección mostrada.
  const setSectionTab = (value: SeccionVentas, query = '') => { setSectionTabState(value); if (seccion && value !== seccion) irA(rutaSeccion[value] + query) }
  // Desde la lista de oportunidades llega por URL (?oportunidadId=&clienteId=) al remontar la página de cotizaciones.
  const [opportunityForQuote, setOpportunityForQuote] = useState<Pick<Oportunidad, 'id' | 'clienteId'> | null>(() => { const id = idInicial('oportunidadId'); const clienteId = idInicial('clienteId'); return id && clienteId ? { id, clienteId } : null })
  const [ventaInicialId, setVentaInicialId] = useState<number | null>(() => idInicial('ventaId'))
  const [cotizacionInicialId] = useState(() => idInicial('ventaId') ? null : idInicial('cotizacionId'))
  const lock = useRef(false); const requestId = useRef(0); const idempotency = useRef<{ signature: string; key: string } | null>(null)
  const runIdempotent = async <T,>(operation: string, id: number | null, payload: unknown, send: (key: string) => Promise<T>, clearOnSuccess = true) => {
    const signature = JSON.stringify([operation, id, payload])
    if (idempotency.current?.signature !== signature) idempotency.current = { signature, key: uuid() }
    const result = await send(idempotency.current.key)
    if (clearOnSuccess) idempotency.current = null
    return result
  }
  const load = useCallback(async (requestedPage = page) => {
    const request = ++requestId.current; setLoading(true); setError('')
    try {
      const result = await listarCotizaciones({ q: q.trim().slice(0, 100) || undefined, estado: estado || undefined, clienteId: clienteId ? Number(clienteId) : undefined, pagina: requestedPage, limite: LIMITE, sortBy, sortDir })
      if (request !== requestId.current) return
      setRows(result.items); setPage(result.pagina); setHasMore(result.hayMas); setTotal(result.total)
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
  const startNew = () => { resetIntent(); setOpportunityForQuote(null); setDetail(null); setEditing(false); setNotice(''); setView('new') }
  const quoteOpportunity = (item: Oportunidad) => { resetIntent(); setOpportunityForQuote(item); setDetail(null); setEditing(false); setView('new'); setSectionTab('cotizaciones', `?oportunidadId=${item.id}&clienteId=${item.clienteId}`); setNotice('') }
  const open = useCallback(async (id: number, edit = false) => {
    setBusy(true); setError('')
    try {
      const quote = await obtenerCotizacion(id)
      setDetail(quote); setEditing(edit && quote.accionesPermitidas.editar); setView('detail'); setNotice('')
    } catch (cause) { setError(message(cause)); setEditing(false) }
    finally { setBusy(false) }
  }, [])
  useEffect(() => {
    let live = true
    queueMicrotask(() => { if (live && cotizacionInicialId) void open(cotizacionInicialId) })
    return () => { live = false }
  }, [cotizacionInicialId, open])
  const save = async (value: CotizacionDraft | CotizacionPatch) => {
    if (lock.current || busy) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (editing && detail && 'version' in value) {
        const updated = await actualizarCotizacion(detail.id, value)
        setDetail(updated); setEditing(false); setNotice('Borrador actualizado. Las líneas se conservaron salvo que solicitaste reemplazarlas.')
      } else {
        const created = await runIdempotent('cotizacion:crear', null, value, key => crearCotizacion(value as CotizacionDraft, key))
        setDetail(created); setOpportunityForQuote(null); setView('detail'); setNotice('Borrador creado. Los precios y totales los calculó el servidor.')
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
  const convert = async (source?: Pick<CotizacionResumen, 'id' | 'version' | 'clienteNombreRegistrado'>) => {
    const target = source ?? detail
    if (!target || (detail?.id === target.id && !detail.accionesPermitidas.convertirVenta) || lock.current || busy) return
    if (!window.confirm(`¿Convertir la cotización C-${target.id} de ${target.clienteNombreRegistrado} en una venta? La facturación se registra por separado.`)) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    let venta: VentaResumen | null = null
    try {
      venta = await runIdempotent<VentaResumen>('cotizacion:convertir-venta', target.id, { version: target.version }, key => convertirCotizacionEnVenta(target.id, target.version, key), false)
      const updatedQuote = await obtenerCotizacion(target.id)
      setDetail(updatedQuote)
      setVentaInicialId(venta.id)
      setSectionTab('ventas')
      setNotice('Venta registrada. La facturación se registra por separado.')
      resetIntent()
      await load(1)
    } catch (cause) {
      setError(message(cause))
      try { setDetail(await obtenerCotizacion(target.id)) } catch {
        if (venta) { setVentaInicialId(venta.id); setSectionTab('ventas'); setNotice('Venta registrada. La facturación se registra por separado.') }
        /* conservar la intención para reintentar con la misma clave */
      }
    } finally { lock.current = false; setBusy(false) }
  }
  const columns: DataTableColumn<CotizacionResumen>[] = [
    { key: 'id', header: 'Cotización', render: row => <button className="cotizaciones__link" disabled={busy} onClick={() => void open(row.id)}>C-{row.id}</button>, sortable: true },
    { key: 'cliente', header: 'Cliente', render: row => row.clienteNombreRegistrado },
    { key: 'estado', header: 'Estado', render: row => <EstadoCotizacionBadge estado={row.estadoEfectivo} /> },
    { key: 'venceEn', header: 'Vence', render: row => date(row.venceEn), sortable: true },
    { key: 'total', header: 'Total', render: row => money(row.total), align: 'end' },
    { key: 'acciones', header: 'Acciones', render: row => <AccionesFila><IconButton icon={EyeIcon} label="Ver detalle" disabled={busy} onClick={() => void open(row.id)} />{row.accionesPermitidas.editar && <IconButton icon={PencilSimpleIcon} label="Editar borrador" disabled={busy} onClick={() => void open(row.id, true)} />}{row.accionesPermitidas.convertirVenta && <IconButton icon={ShoppingCartIcon} variant="secondary" label="Convertir a venta" disabled={busy} onClick={() => void convert(row)} />}{row.ventaId && <IconButton icon={ReceiptIcon} variant="secondary" label={`Ver venta V-${row.ventaId}`} disabled={busy} onClick={() => { setVentaInicialId(row.ventaId); setSectionTab('ventas', `?ventaId=${row.ventaId}`) }} />}</AccionesFila> },
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
      <DataTable columns={columns} rows={rows} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar', placeholder: 'Cliente o cotización' }} sort={{ key: sortKey, direction: sortDir, onChange: changeSort }} pagination={{ pagina: page, limite: LIMITE, hayMas: hasMore, total, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay cotizaciones" emptyDescription="Crea un borrador para comenzar." />
    </>
  } else if (form) {
    content = <CotizacionForm quote={editing ? detail : null} clients={clients} busy={busy} oportunidadId={opportunityForQuote?.id} clienteInicialId={opportunityForQuote?.clienteId} onSave={save} onCancel={() => { resetIntent(); setOpportunityForQuote(null); setEditing(false); if (view === 'new') setView('list') }} />
  } else if (detail) {
    content = <CotizacionDetalle quote={detail} busy={busy} onEdit={() => setEditing(true)} onSend={() => void transition('enviar')} onDecision={decision => void transition('decision', decision)} onNote={addNote} onConvert={() => void convert()} onOpenVenta={() => { if (detail.ventaId) { setVentaInicialId(detail.ventaId); setSectionTab('ventas') } }} onBack={() => { resetIntent(); setView('list'); setDetail(null); setNotice('') }} />
  } else content = <p role="status">Selecciona una cotización.</p>

  return <div className="comercial-scope cotizaciones">{sectionTab === 'cotizaciones' && <ModuleHeader breadcrumb={migas(view === 'new' ? 'Nueva cotización' : 'Cotizaciones')} title={view === 'new' ? 'Nueva cotización' : 'Cotizaciones'} description={view === 'list' ? 'Propuestas enviadas al cliente y su conversión en ventas.' : undefined} action={view === 'list' ? <Button variant="primary" disabled={busy} onClick={startNew}>Nueva cotización</Button> : undefined} />}
    {notice && <div role="status" className="cotizaciones__notice tk-toast">{notice}</div>}{error && <p role="alert" className="cotizaciones__error">{error}</p>}{sectionTab === 'oportunidades' ? <OportunidadesPage onCreateQuote={quoteOpportunity} /> : sectionTab === 'ventas' ? <VentasPage ventaInicialId={ventaInicialId ?? undefined} /> : content}
  </div>
}
