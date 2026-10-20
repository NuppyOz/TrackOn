import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../../clientes/clientes.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { listarConceptos } from '../../../comercial/tarifas/tarifas.api'
import type { ConceptoComercial } from '../../../comercial/tarifas/tarifas.api'
import { listarVentas, obtenerVenta } from '../../../comercial/ventas/ventas.api'
import type { VentaResumen } from '../../../comercial/ventas/ventas.types'
import { obtenerCotizacion } from '../../../comercial/cotizaciones/cotizaciones.api'
import type { Cotizacion } from '../../../comercial/cotizaciones/cotizaciones.types'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { aplicarFacturable, crearFacturable, listarFacturables, obtenerFacturable } from './facturables.api'
import type { Facturable, FacturableNuevo, Pagina } from './facturables.types'
import { listarComprobantes, obtenerComprobante } from '../documentos/documentos.api'
import type { Comprobante, ComprobanteLinea } from '../documentos/documentos.types'
import '../../procedencia/h5-sources.css'
import '../documentos/finanzas.css'

const LIMIT = 25
const localDate = (value: string) => new Date(new Date(value).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
const isoDate = (value: string) => new Date(`${value}:00-06:00`).toISOString()
const date = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.'
const randomKey = (): string => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}-${Math.random()}`
const milli = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 1000n + BigInt(fraction.padEnd(3, '0')) }
type Draft = { clienteId: string; conceptoId: string; referencia: string; fechaEfectiva: string; cantidad: string; ordenId: string; ventaId: string; lineaCotizacionId: string; observacion: string; aplicarFecha: string; aplicarCantidad: string; comprobanteId: string; lineaComprobanteId: string }
const emptyDraft = (): Draft => ({ clienteId: '', conceptoId: '', referencia: '', fechaEfectiva: '', cantidad: '', ordenId: '', ventaId: '', lineaCotizacionId: '', observacion: '', aplicarFecha: '', aplicarCantidad: '', comprobanteId: '', lineaComprobanteId: '' })
type Mode = 'create' | 'apply' | null
type FacturablesPageProps = Readonly<{ onBusyChange?: (busy: boolean) => void }>

export function FacturablesPage({ onBusyChange }: FacturablesPageProps = {}) {
  const [result, setResult] = useState<Pagina<Facturable> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>(null); const [draft, setDraft] = useState(emptyDraft()); const [detail, setDetail] = useState<Facturable | null>(null)
  const [clients, setClients] = useState<Cliente[]>([]); const [clientSearch, setClientSearch] = useState(''); const [clientPage, setClientPage] = useState(1)
  const [conceptSearch, setConceptSearch] = useState(''); const [conceptPage, setConceptPage] = useState(1); const [concepts, setConcepts] = useState<ConceptoComercial[]>([]); const [conceptHasMore, setConceptHasMore] = useState(false); const [conceptLoading, setConceptLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState(''); const [orderPage, setOrderPage] = useState(1); const [orders, setOrders] = useState<OrdenResumen[]>([]); const [orderHasMore, setOrderHasMore] = useState(false)
  const [saleSearch, setSaleSearch] = useState(''); const [salePage, setSalePage] = useState(1); const [sales, setSales] = useState<VentaResumen[]>([]); const [saleHasMore, setSaleHasMore] = useState(false); const [saleLines, setSaleLines] = useState<Cotizacion['lineas']>([]); const [saleDetailLoading, setSaleDetailLoading] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState(''); const [invoicePage, setInvoicePage] = useState(1); const [invoices, setInvoices] = useState<Comprobante[]>([]); const [invoiceHasMore, setInvoiceHasMore] = useState(false); const [invoiceLines, setInvoiceLines] = useState<ComprobanteLinea[]>([])
  const request = useRef(0); const detailRequest = useRef(0); const invoiceDetailRequest = useRef(0); const saleDetailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null)
  useEffect(() => { onBusyChange?.(saving); return () => { if (saving) onBusyChange?.(false) } }, [saving, onBusyChange])
  const load = useCallback(async () => { const current = ++request.current; setLoading(true); setError(''); try { const data = await listarFacturables({ q: q.trim() || undefined, pagina: page, limite: LIMIT }); if (current === request.current) setResult(data) } catch (cause) { if (current === request.current) setError(errorText(cause)) } finally { if (current === request.current) setLoading(false) } }, [q, page])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false; request.current += 1 } }, [load])
  useEffect(() => { let active = true; listarClientes().then(items => { if (active) setClients(items) }).catch(cause => { if (active) setError(errorText(cause)) }); return () => { active = false } }, [])
  useEffect(() => {
    if (mode !== 'create') return
    let active = true; queueMicrotask(() => { if (active) setConceptLoading(true) })
    listarConceptos({ q: conceptSearch.trim() || undefined, estado: 'activos', pagina: conceptPage, limite: LIMIT, sortBy: 'nombre', sortDir: 'asc' })
      .then(data => { if (active) { setConcepts(old => conceptPage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setConceptHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(errorText(cause)) }).finally(() => { if (active) setConceptLoading(false) })
    return () => { active = false }
  }, [mode, conceptSearch, conceptPage])
  useEffect(() => { if (mode !== 'create' || !draft.clienteId) return; let active = true; listarOrdenes({ estado: '', buscar: orderSearch, clienteId: draft.clienteId, pagina: orderPage, limite: LIMIT }).then(data => { if (active) { setOrders(old => orderPage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setOrderHasMore(data.hayMas) } }).catch(cause => { if (active) setError(errorText(cause)) }); return () => { active = false } }, [mode, draft.clienteId, orderSearch, orderPage])
  useEffect(() => {
    if (mode !== 'create' || !draft.clienteId) return
    let active = true
    listarVentas({ q: saleSearch.trim() || undefined, clienteId: Number(draft.clienteId), pagina: salePage, limite: LIMIT, sortBy: 'confirmadaEn', sortDir: 'desc' })
      .then(data => { if (active) { setSales(old => salePage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setSaleHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(errorText(cause)) })
    return () => { active = false }
  }, [mode, draft.clienteId, saleSearch, salePage])
  useEffect(() => {
    if (mode !== 'apply' || !detail) return
    let active = true
    listarComprobantes({ q: invoiceSearch.trim() || undefined, clienteId: detail.clienteId, pagina: invoicePage, limite: LIMIT })
      .then(data => { if (active) { setInvoices(old => invoicePage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setInvoiceHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(errorText(cause)) })
    return () => { active = false }
  }, [mode, detail, invoiceSearch, invoicePage])
  const update = (field: keyof Draft, value: string) => { intent.current = null; setDraft(current => ({ ...current, [field]: value, ...(field === 'clienteId' ? { ordenId: '', ventaId: '', lineaCotizacionId: '' } : field === 'conceptoId' ? { ventaId: '', lineaCotizacionId: '' } : {}) })); if (field === 'clienteId') { setOrders([]); setOrderPage(1); setSales([]); setSalePage(1); setSaleLines([]); saleDetailRequest.current++ } if (field === 'conceptoId') { setSaleLines([]); saleDetailRequest.current++ } }
  const openCreate = () => { detailRequest.current++; invoiceDetailRequest.current++; saleDetailRequest.current++; setDetail(null); setDraft(emptyDraft()); setMode('create'); setError(''); intent.current = null; setConcepts([]); setConceptPage(1); setConceptSearch(''); setOrders([]); setOrderPage(1); setOrderSearch(''); setSales([]); setSalePage(1); setSaleSearch(''); setSaleLines([]); setClientPage(1); setClientSearch('') }
  const openApply = () => { if (!detail) return; invoiceDetailRequest.current++; setDraft({ ...emptyDraft(), aplicarFecha: localDate(new Date().toISOString()), aplicarCantidad: detail.pendiente }); setMode('apply'); setError(''); intent.current = null; setInvoices([]); setInvoiceLines([]); setInvoicePage(1); setInvoiceSearch('') }
  const close = () => { if (!saving) { detailRequest.current++; invoiceDetailRequest.current++; setMode(null); setError('') } }
  const view = async (id: number) => { const current = ++detailRequest.current; invoiceDetailRequest.current++; setError(''); try { const record = await obtenerFacturable(id); if (current === detailRequest.current) { setDetail(record); setMode(null) } } catch (cause) { if (current === detailRequest.current) setError(errorText(cause)) } }
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; const raw = new URLSearchParams(window.location.search).get('facturableId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) void view(id) } }); return () => { active = false } }, [])
  const submitCreate = async () => {
    if (saving) return
    const payload: FacturableNuevo = { clienteId: Number(draft.clienteId), conceptoId: Number(draft.conceptoId), referencia: draft.referencia.trim().toUpperCase(), fechaEfectiva: isoDate(draft.fechaEfectiva), cantidad: draft.cantidad.trim(), ...(draft.ordenId ? { ordenId: Number(draft.ordenId) } : {}), ...(draft.ventaId && draft.lineaCotizacionId ? { ventaId: Number(draft.ventaId), lineaCotizacionId: Number(draft.lineaCotizacionId) } : {}), ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}) }
    const signature = JSON.stringify(payload); if (intent.current?.signature !== signature) intent.current = { signature, key: randomKey() }
    setSaving(true); setError(''); try { await crearFacturable(payload, intent.current.key); intent.current = null; setMode(null); await load() } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }
  const submitApply = async () => {
    if (!detail || saving) return
    const payload = { lineaComprobanteId: Number(draft.lineaComprobanteId), cantidad: draft.aplicarCantidad.trim(), fechaEfectiva: isoDate(draft.aplicarFecha) }
    const signature = JSON.stringify({ id: detail.id, ...payload }); if (intent.current?.signature !== signature) intent.current = { signature, key: randomKey() }
    setSaving(true); setError(''); try { const updated = await aplicarFacturable(detail.id, payload, intent.current.key); intent.current = null; setDetail(updated); setMode(null); await load() } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }
  const selectInvoice = async (id: string) => {
    const current = ++invoiceDetailRequest.current
    intent.current = null; setDraft(current => ({ ...current, comprobanteId: id, lineaComprobanteId: '' })); setInvoiceLines([])
    if (!id) return
    try { const invoice = await obtenerComprobante(Number(id)); if (current === invoiceDetailRequest.current && !invoice.anuladaEn && detail?.clienteId === invoice.clienteId) setInvoiceLines(invoice.lineas ?? []) }
    catch (cause) { if (current === invoiceDetailRequest.current) setError(errorText(cause)) }
  }
  const selectSale = async (id: string) => {
    const current = ++saleDetailRequest.current
    setDraft(value => ({ ...value, ventaId: id, lineaCotizacionId: '' })); setSaleLines([]); setSaleDetailLoading(Boolean(id))
    if (!id) { setSaleDetailLoading(false); return }
    try {
      const sale = await obtenerVenta(Number(id))
      const quote = await obtenerCotizacion(sale.cotizacionId)
      if (current === saleDetailRequest.current && sale.clienteId === Number(draft.clienteId)) setSaleLines(quote.lineas.filter(line => (line.tipo === 'SERVICIO' || line.tipo === 'MANO_OBRA') && line.conceptoId === Number(draft.conceptoId)))
    } catch (cause) { if (current === saleDetailRequest.current) setError(errorText(cause)) }
    finally { if (current === saleDetailRequest.current) setSaleDetailLoading(false) }
  }
  const clientsFiltered = clients.filter(client => nombreCliente(client).toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()) || client.codigo.toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()))
  const clientPages = Math.max(1, Math.ceil(clientsFiltered.length / LIMIT)); const shownClients = clientsFiltered.slice((clientPage - 1) * LIMIT, clientPage * LIMIT)
  const eligibleConcepts = concepts.filter(item => item.tipo === 'SERVICIO' || item.tipo === 'MANO_OBRA')
  const columns: DataTableColumn<Facturable>[] = [
    { key: 'referencia', header: 'Servicio realizado', render: row => <button type="button" className="h5-link" onClick={() => void view(row.id)}>{row.referencia}</button> },
    { key: 'clienteNombre', header: 'Cliente', render: row => row.clienteNombre },
    { key: 'conceptoNombre', header: 'Concepto', render: row => `${row.conceptoNombre} (${row.unidad})` },
    { key: 'cantidad', header: 'Realizado', render: row => `${row.cantidad} ${row.unidad}` },
    { key: 'pendiente', header: 'Pendiente', render: row => <strong>{row.pendiente} {row.unidad}</strong> },
    { key: 'fechaEfectiva', header: 'Fecha', render: row => date(row.fechaEfectiva) },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones de ${row.referencia}`}><button type="button" onClick={() => void view(row.id)}>Ver detalle</button></ActionMenu> },
  ]
  const selectedConcept = concepts.find(item => String(item.id) === draft.conceptoId)
  const selectedSaleLine = saleLines.find(line => String(line.id) === draft.lineaCotizacionId)
  const hasValidSaleLink = !draft.ventaId || Boolean(draft.lineaCotizacionId && selectedSaleLine && !saleDetailLoading && milli(draft.cantidad || '0') <= milli(selectedSaleLine.cantidad))
  const validCreate = Boolean(draft.clienteId && selectedConcept && (selectedConcept.tipo === 'SERVICIO' || selectedConcept.tipo === 'MANO_OBRA') && draft.referencia.trim() && draft.fechaEfectiva && /^(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(draft.cantidad) && milli(draft.cantidad) > 0n && hasValidSaleLink)
  const validApply = Boolean(draft.comprobanteId && draft.lineaComprobanteId && draft.aplicarFecha && /^(0|[1-9]\d{0,8})(\.\d{1,3})?$/.test(draft.aplicarCantidad) && milli(draft.aplicarCantidad) > 0n && detail && milli(draft.aplicarCantidad) <= milli(detail.pendiente))
  return <section className="h5-source" aria-labelledby="facturables-title">
    <ModuleHeader breadcrumb="Inteligencia / Registros financieros" title="Servicios realizados" description="Registra trabajo realizado con concepto, cliente y cantidad. La venta no registra servicios automáticamente." action={!mode && !detail ? <Button variant="primary" onClick={openCreate}>Registrar servicio</Button> : undefined} />
    {error && <p role="alert" className="h5-error">{error}</p>}
    {!mode && (detail ? <section className="h5-detail"><div className="h5-detail-head"><div><h2>{detail.referencia} · {detail.clienteNombre}</h2><SemanticBadge label={milli(detail.pendiente) > 0n ? 'Pendiente de aplicar' : 'Aplicado'} variant={milli(detail.pendiente) > 0n ? 'warning' : 'success'} /></div><Button onClick={() => setDetail(null)}>Volver al listado</Button></div>
      <dl><div><dt>Concepto</dt><dd>{detail.conceptoNombre} · {detail.unidad}</dd></div><div><dt>Fecha efectiva</dt><dd>{date(detail.fechaEfectiva)}</dd></div><div><dt>Cantidad realizada</dt><dd>{detail.cantidad} {detail.unidad}</dd></div><div><dt>Pendiente de aplicar</dt><dd>{detail.pendiente} {detail.unidad}</dd></div><div><dt>Orden de trabajo</dt><dd>{detail.ordenId ? `#${detail.ordenId}` : 'Sin orden vinculada'}</dd></div><div><dt>Venta</dt><dd>{detail.ventaId ? `#${detail.ventaId} · línea de cotización #${detail.lineaCotizacionId}` : 'Sin venta vinculada'}</dd></div><div><dt>Registrado</dt><dd>{date(detail.registradoEn)}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div></dl>
      <div className="finanzas-lines"><h3>Aplicaciones a comprobantes</h3>{detail.aplicaciones?.length ? <table><thead><tr><th>Comprobante</th><th>Cantidad</th><th>Fecha</th><th>Estado comprobante</th></tr></thead><tbody>{detail.aplicaciones.map(item => <tr key={item.id}><td>{item.comprobanteReferencia}</td><td>{item.cantidad} {detail.unidad}</td><td>{date(item.fechaEfectiva)}</td><td>{item.comprobanteAnuladaEn ? 'Anulado' : 'Vigente'}</td></tr>)}</tbody></table> : <p>Este servicio todavía no tiene aplicaciones.</p>}</div>
      {milli(detail.pendiente) > 0n && <div className="h5-detail-actions"><Button variant="primary" onClick={openApply}>Aplicar a comprobante</Button></div>}
    </section> : <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar servicios realizados', placeholder: 'Referencia' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMIT, hayMas: result?.hayMas ?? false, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay servicios registrados" emptyDescription="Registra el trabajo realizado para llevar su cantidad pendiente de aplicación." />)}
    {mode && <section className="h5-dialog h5-form-page" aria-labelledby="facturable-form-title"><h2 id="facturable-form-title">{mode === 'create' ? 'Registrar servicio realizado' : `Aplicar ${detail?.referencia ?? 'servicio'} a comprobante`}</h2>
      {mode === 'create' ? <>
        <label>Cliente<select disabled={saving} value={draft.clienteId} onChange={event => update('clienteId', event.currentTarget.value)} required><option value="">Selecciona un cliente</option>{shownClients.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label>
        <label>Buscar cliente<input type="search" disabled={saving} value={clientSearch} onChange={event => { setClientSearch(event.currentTarget.value); setClientPage(1) }} placeholder="Nombre o código" /></label><div className="finanzas-selector-pages"><button type="button" disabled={clientPage <= 1 || saving} onClick={() => setClientPage(clientPage - 1)}>Anterior clientes</button><span>Página {clientPage} de {clientPages}</span><button type="button" disabled={clientPage >= clientPages || saving} onClick={() => setClientPage(clientPage + 1)}>Siguiente clientes</button></div>
        <label>Buscar concepto<input type="search" disabled={saving} value={conceptSearch} onChange={event => { setConceptSearch(event.currentTarget.value); setConceptPage(1); setConcepts([]) }} placeholder="Código o nombre" /></label>
        <label>Concepto de servicio<select disabled={saving} value={draft.conceptoId} onChange={event => update('conceptoId', event.currentTarget.value)} required><option value="">Selecciona servicio o mano de obra</option>{eligibleConcepts.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre} ({item.unidad})</option>)}</select></label>
        {conceptHasMore && <Button type="button" disabled={conceptLoading || saving} onClick={() => setConceptPage(value => value + 1)}>{conceptLoading ? 'Cargando…' : 'Cargar más conceptos'}</Button>}
        <label>Referencia<input maxLength={100} disabled={saving} value={draft.referencia} onChange={event => update('referencia', event.currentTarget.value)} required /></label><label>Fecha efectiva<input type="datetime-local" disabled={saving} value={draft.fechaEfectiva} onChange={event => update('fechaEfectiva', event.currentTarget.value)} required /></label><label>Cantidad realizada ({selectedConcept?.unidad ?? 'unidad'})<input inputMode="decimal" disabled={saving} value={draft.cantidad} onChange={event => update('cantidad', event.currentTarget.value)} placeholder="0.000" required /></label>
        <label>Orden de trabajo (opcional)<select disabled={saving || !draft.clienteId} value={draft.ordenId} onChange={event => update('ordenId', event.currentTarget.value)}><option value="">Sin orden</option>{orders.map(order => <option key={order.id} value={order.id}>{order.numero} · {order.clienteNombreRegistrado}</option>)}</select></label>{draft.clienteId && <><label>Buscar orden<input type="search" disabled={saving} value={orderSearch} onChange={event => { setOrderSearch(event.currentTarget.value); setOrderPage(1); setOrders([]) }} placeholder="Número o cliente" /></label>{orderHasMore && <Button type="button" disabled={saving} onClick={() => setOrderPage(value => value + 1)}>Cargar más órdenes</Button>}</>}
        <fieldset disabled={saving || !draft.clienteId || !draft.conceptoId} className="finanzas-fieldset"><legend>Vínculo opcional a venta</legend>
          <label>Buscar venta<input type="search" value={saleSearch} onChange={event => { intent.current = null; setSaleSearch(event.currentTarget.value); setSalePage(1); setSales([]); setSaleLines([]); setDraft(value => ({ ...value, ventaId: '', lineaCotizacionId: '' })); saleDetailRequest.current++ }} placeholder="Referencia de cotización" /></label>
          <label>Venta del mismo cliente<select value={draft.ventaId} onChange={event => void selectSale(event.currentTarget.value)}><option value="">Sin venta vinculada</option>{sales.map(sale => <option key={sale.id} value={sale.id}>Venta #{sale.id} · cotización #{sale.cotizacionId} · C$ {sale.total}</option>)}</select></label>
          {saleHasMore && <Button type="button" disabled={saving} onClick={() => setSalePage(value => value + 1)}>Cargar más ventas</Button>}
          {saleDetailLoading && <p role="status">Cargando líneas de la cotización…</p>}
          {draft.ventaId && <label>Línea vendida compatible<select value={draft.lineaCotizacionId} onChange={event => update('lineaCotizacionId', event.currentTarget.value)} required><option value="">Selecciona una línea del concepto</option>{saleLines.map(line => <option key={line.id} value={line.id}>{line.descripcion} · {line.cantidad} {line.unidad}</option>)}</select></label>}
        </fieldset>
        <label>Observación (opcional)<textarea maxLength={1000} disabled={saving} value={draft.observacion} onChange={event => update('observacion', event.currentTarget.value)} /></label>
      </> : <>
        <p>Elige una línea de un comprobante vigente del mismo cliente. La aplicación conserva las cantidades por unidad y no calcula un importe.</p>
        <label>Buscar comprobante<input type="search" disabled={saving} value={invoiceSearch} onChange={event => { setInvoiceSearch(event.currentTarget.value); setInvoicePage(1); setInvoices([]) }} placeholder="Referencia o emisor" /></label>
        <label>Comprobante<select disabled={saving} value={draft.comprobanteId} onChange={event => void selectInvoice(event.currentTarget.value)} required><option value="">Selecciona comprobante</option>{invoices.filter(item => !item.anuladaEn).map(item => <option key={item.id} value={item.id}>{item.referencia} · saldo C$ {item.saldo}</option>)}</select></label>
        {invoiceHasMore && <Button type="button" disabled={saving} onClick={() => setInvoicePage(value => value + 1)}>Cargar más comprobantes</Button>}
        <label>Línea del comprobante<select disabled={saving} value={draft.lineaComprobanteId} onChange={event => update('lineaComprobanteId', event.currentTarget.value)} required><option value="">Selecciona una línea compatible</option>{invoiceLines.filter(line => line.conceptoId === detail?.conceptoId).map(line => <option key={line.id} value={line.id}>{line.descripcion} · C$ {line.importe}</option>)}</select></label>
        <label>Fecha efectiva<input type="datetime-local" disabled={saving} value={draft.aplicarFecha} onChange={event => update('aplicarFecha', event.currentTarget.value)} required /></label><label>Cantidad a aplicar ({detail?.unidad})<input inputMode="decimal" disabled={saving} value={draft.aplicarCantidad} onChange={event => update('aplicarCantidad', event.currentTarget.value)} required /></label><p>Pendiente actual: {detail?.pendiente} {detail?.unidad}. Aplicar solo deja trazabilidad; no modifica el importe fiscal.</p>
      </>}
      <div className="h5-dialog__actions"><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant="primary" onClick={() => void (mode === 'create' ? submitCreate() : submitApply())} disabled={saving || (mode === 'create' ? !validCreate : !validApply)}>{saving ? 'Guardando…' : mode === 'create' ? 'Registrar servicio' : 'Aplicar cantidad'}</Button></div>
    </section>}
  </section>
}
