import { BusquedaSelector } from '../cobros/BusquedaSelector'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../../clientes/clientes.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { listarComprobantes } from '../documentos/documentos.api'
import type { Comprobante } from '../documentos/documentos.types'
import { claveIntencion, centavos, dinero, fechaVisible, inputManagua, isoManagua, LIMITE_FINANZAS, textoError } from '../cobros/finanzas-common'
import { crearCosto, listarCostos, obtenerCosto, revertirCosto } from './costos.api'
import type { CategoriaCosto, Costo, CostoNuevo, Pagina } from './costos.types'
import '../documentos/finanzas.css'
import '../cobros/cobros.css'
import '../../procedencia/h5-sources.css'

type Draft = { referencia: string; fechaEfectiva: string; categoria: CategoriaCosto | ''; importe: string; clienteId: string; ordenId: string; comprobanteId: string; observacion: string; motivo: string; fechaReversion: string }
const draftVacio = (): Draft => ({ referencia: '', fechaEfectiva: '', categoria: '', importe: '', clienteId: '', ordenId: '', comprobanteId: '', observacion: '', motivo: '', fechaReversion: '' })
const MONTO = /^(0|[1-9]\d{0,13})(\.\d{1,2})?$/
type Mode = 'create' | 'reverse' | null
type PageProps = Readonly<{ onBusyChange?: (busy: boolean) => void }>

export function CostosPage({ onBusyChange }: PageProps = {}) {
  const [result, setResult] = useState<Pagina<Costo> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>(null); const [draft, setDraft] = useState(draftVacio()); const [detail, setDetail] = useState<Costo | null>(null)
  const [clients, setClients] = useState<Cliente[]>([]); const [clientSearch, setClientSearch] = useState(''); const [clientPage, setClientPage] = useState(1)
  const [orderSearch, setOrderSearch] = useState(''); const [orderPage, setOrderPage] = useState(1); const [orders, setOrders] = useState<OrdenResumen[]>([]); const [orderHasMore, setOrderHasMore] = useState(false); const [orderLoading, setOrderLoading] = useState(false)
  const [invoiceSearch, setInvoiceSearch] = useState(''); const [invoicePage, setInvoicePage] = useState(1); const [invoices, setInvoices] = useState<Comprobante[]>([]); const [invoiceHasMore, setInvoiceHasMore] = useState(false); const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdenResumen | null>(null); const [selectedInvoice, setSelectedInvoice] = useState<Comprobante | null>(null)
  const listRequest = useRef(0); const detailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null)
  useEffect(() => { onBusyChange?.(saving); return () => { if (saving) onBusyChange?.(false) } }, [saving, onBusyChange])
  const load = useCallback(async () => { const current = ++listRequest.current; setLoading(true); setError(''); try { const data = await listarCostos({ q: q.trim() || undefined, pagina: page, limite: LIMITE_FINANZAS }); if (current === listRequest.current) setResult(data) } catch (cause) { if (current === listRequest.current) setError(textoError(cause)) } finally { if (current === listRequest.current) setLoading(false) } }, [q, page])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false; listRequest.current += 1 } }, [load])
  useEffect(() => { let active = true; listarClientes().then(data => { if (active) setClients(data) }).catch(cause => { if (active) setError(textoError(cause)) }); return () => { active = false } }, [])
  useEffect(() => {
    if (mode !== 'create') return
    let active = true; queueMicrotask(() => { if (active) setInvoiceLoading(true) })
    listarComprobantes({ q: invoiceSearch.trim() || undefined, ...(draft.clienteId ? { clienteId: Number(draft.clienteId) } : {}), pagina: invoicePage, limite: LIMITE_FINANZAS })
      .then(data => { if (active) { setInvoices(old => invoicePage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setInvoiceHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(textoError(cause)) }).finally(() => { if (active) setInvoiceLoading(false) })
    return () => { active = false }
  }, [mode, draft.clienteId, invoiceSearch, invoicePage])
  useEffect(() => {
    if (mode !== 'create') return
    let active = true; queueMicrotask(() => { if (active) setOrderLoading(true) })
    listarOrdenes({ estado: '', buscar: orderSearch, ...(draft.clienteId ? { clienteId: draft.clienteId } : {}), pagina: orderPage, limite: LIMITE_FINANZAS })
      .then(data => { if (active) { setOrders(old => orderPage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setOrderHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(textoError(cause)) }).finally(() => { if (active) setOrderLoading(false) })
    return () => { active = false }
  }, [mode, draft.clienteId, orderSearch, orderPage])
  const update = (field: keyof Draft, value: string) => { intent.current = null; setDraft(current => ({ ...current, [field]: value, ...(field === 'clienteId' ? { ordenId: '', comprobanteId: '' } : {}) })); if (field === 'clienteId') { setOrders([]); setSelectedOrder(null); setOrderPage(1); setInvoices([]); setSelectedInvoice(null); setInvoicePage(1) } }
  const openCreate = () => { detailRequest.current++; intent.current = null; setDetail(null); setDraft(draftVacio()); setMode('create'); setError(''); setClientSearch(''); setClientPage(1); setOrderSearch(''); setOrderPage(1); setOrders([]); setSelectedOrder(null); setInvoiceSearch(''); setInvoicePage(1); setInvoices([]); setSelectedInvoice(null) }
  const view = async (id: number) => { const current = ++detailRequest.current; setError(''); try { const record = await obtenerCosto(id); if (current === detailRequest.current) { setDetail(record); setMode(null) } } catch (cause) { if (current === detailRequest.current) setError(textoError(cause)) } }
  const close = () => { if (!saving) { detailRequest.current++; setMode(null); setError('') } }
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; const raw = new URLSearchParams(window.location.search).get('costoId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) void view(id) } }); return () => { active = false } }, [])
  const openReverse = () => { if (!detail) return; intent.current = null; setDraft({ ...draftVacio(), fechaReversion: inputManagua(new Date().toISOString()) }); setMode('reverse'); setError('') }
  const submitCreate = async () => {
    if (saving) return
    const payload: CostoNuevo = { referencia: draft.referencia.trim().toUpperCase(), fechaEfectiva: isoManagua(draft.fechaEfectiva), categoria: draft.categoria as CategoriaCosto, importe: draft.importe.trim(), ...(draft.clienteId ? { clienteId: Number(draft.clienteId) } : {}), ...(draft.ordenId ? { ordenId: Number(draft.ordenId) } : {}), ...(draft.comprobanteId ? { comprobanteId: Number(draft.comprobanteId) } : {}), ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}) }
    const signature = JSON.stringify(payload); if (intent.current?.signature !== signature) intent.current = { signature, key: claveIntencion() }
    setSaving(true); setError(''); try { await crearCosto(payload, intent.current.key); intent.current = null; setMode(null); await load() } catch (cause) { setError(textoError(cause)) } finally { setSaving(false) }
  }
  const submitReverse = async () => {
    if (!detail || saving) return
    const payload = { version: detail.version, fechaEfectiva: isoManagua(draft.fechaReversion), motivo: draft.motivo.trim() }
    const signature = JSON.stringify({ id: detail.id, ...payload }); if (intent.current?.signature !== signature) intent.current = { signature, key: claveIntencion() }
    setSaving(true); setError(''); try { const updated = await revertirCosto(detail.id, payload, intent.current.key); intent.current = null; setDetail(updated); setMode(null); await load() } catch (cause) { setError(textoError(cause)) } finally { setSaving(false) }
  }
  const clientsFiltered = clients.filter(client => nombreCliente(client).toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()) || client.codigo.toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()))
  const clientPages = Math.max(1, Math.ceil(clientsFiltered.length / LIMITE_FINANZAS)); const clientPageRows = clientsFiltered.slice((clientPage - 1) * LIMITE_FINANZAS, clientPage * LIMITE_FINANZAS); const chosenClient = clients.find(client => String(client.id) === draft.clienteId); const shownClients = chosenClient && !clientPageRows.some(client => client.id === chosenClient.id) ? [chosenClient, ...clientPageRows] : clientPageRows
  const shownOrders = selectedOrder && !orders.some(order => order.id === selectedOrder.id) ? [selectedOrder, ...orders] : orders
  const shownInvoices = selectedInvoice && !invoices.some(invoice => invoice.id === selectedInvoice.id) ? [selectedInvoice, ...invoices] : invoices
  const now = new Date().toISOString()
  const validCreate = Boolean(draft.referencia.trim() && draft.fechaEfectiva && isoManagua(draft.fechaEfectiva) <= now && draft.categoria && MONTO.test(draft.importe) && centavos(draft.importe) > 0n)
  const asignacion = (row: Costo) => row.clienteId || row.ordenId || row.comprobanteId ? 'Asignado' : 'Sin asignar'
  const columns: DataTableColumn<Costo>[] = [
    { key: 'referencia', header: 'Costo', render: row => <button type="button" className="h5-link" onClick={() => void view(row.id)}>{row.referencia}</button> },
    { key: 'fechaEfectiva', header: 'Fecha', render: row => fechaVisible(row.fechaEfectiva) },
    { key: 'categoria', header: 'Categoría', render: row => row.categoria.replace('_', ' ') },
    { key: 'importe', header: 'Importe', render: row => dinero(row.importe) },
    { key: 'asignacion', header: 'Asignación', render: row => <SemanticBadge label={asignacion(row)} variant={asignacion(row) === 'Asignado' ? 'info' : 'warning'} /> },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones del costo ${row.referencia}`}><button type="button" onClick={() => void view(row.id)}>Ver detalle</button></ActionMenu> },
  ]
  return <section className="h5-source finanzas-h6" aria-labelledby="costos-title">
    <ModuleHeader breadcrumb="Inteligencia / Registros financieros" title="Costos registrados" description="Captura costos asociados a cliente, orden o comprobante, o déjalos visibles como sin asignar. El inventario no crea costos automáticamente." action={!mode && !detail ? <Button variant="primary" onClick={openCreate}>Registrar costo</Button> : undefined} />
    {error && <p role="alert" className="h5-error">{error}</p>}
    {!mode && (detail ? <section className="h5-detail"><div className="h5-detail-head"><div><h2>{detail.referencia}</h2><SemanticBadge label={detail.revertidoEn ? 'Revertido' : 'Vigente'} variant={detail.revertidoEn ? 'neutral' : 'success'} /></div><Button onClick={() => setDetail(null)}>Volver al listado</Button></div>
      <dl><div><dt>Fecha efectiva</dt><dd>{fechaVisible(detail.fechaEfectiva)}</dd></div><div><dt>Categoría</dt><dd>{detail.categoria.replace('_', ' ')}</dd></div><div><dt>Importe</dt><dd>{dinero(detail.importe)} NIO</dd></div><div><dt>Cliente</dt><dd>{detail.clienteId ? `${detail.clienteNombre} · #${detail.clienteId}` : 'Sin cliente asignado'}</dd></div><div><dt>Orden de trabajo</dt><dd>{detail.ordenId ? `#${detail.ordenId}` : 'Sin orden vinculada'}</dd></div><div><dt>Comprobante</dt><dd>{detail.comprobanteId ? `${detail.comprobanteReferencia} · #${detail.comprobanteId}` : 'Sin comprobante vinculado'}</dd></div><div><dt>Estado de asignación</dt><dd>{asignacion(detail)}</dd></div><div><dt>Registrado</dt><dd>{fechaVisible(detail.registradoEn)}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div>{detail.revertidoEn && <div><dt>Revertido</dt><dd>{fechaVisible(detail.revertidoEn)} · {detail.motivoReversion}</dd></div>}</dl>
      {!detail.revertidoEn && <div className="h5-detail-actions"><Button variant="danger" onClick={openReverse}>Revertir costo</Button></div>}
    </section> : <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar costos', placeholder: 'Referencia' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMITE_FINANZAS, hayMas: result?.hayMas ?? false, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay costos registrados" emptyDescription="Registra costos incluso cuando todavía no puedes asignarlos." />)}
    {mode && <section className="h5-dialog h5-form-page" aria-labelledby="costo-form-title"><h2 id="costo-form-title">{mode === 'create' ? 'Registrar costo' : `Revertir ${detail?.referencia ?? 'costo'}`}
      </h2>{mode === 'reverse' ? <><p>El costo original se conservará en el historial financiero.</p><label>Fecha de reversión<input type="datetime-local" min={detail ? inputManagua(detail.fechaEfectiva) : undefined} max={inputManagua(now)} disabled={saving} value={draft.fechaReversion} onChange={event => update('fechaReversion', event.currentTarget.value)} required /></label><label>Motivo<textarea maxLength={1000} disabled={saving} value={draft.motivo} onChange={event => update('motivo', event.currentTarget.value)} required /></label></> : <>
        <label>Referencia<input maxLength={100} disabled={saving} value={draft.referencia} onChange={event => update('referencia', event.currentTarget.value)} required /></label><label>Fecha efectiva<input type="datetime-local" disabled={saving} value={draft.fechaEfectiva} onChange={event => update('fechaEfectiva', event.currentTarget.value)} required /></label>
        <label>Categoría<select disabled={saving} value={draft.categoria} onChange={event => update('categoria', event.currentTarget.value)} required><option value="">Selecciona categoría</option><option value="MANO_OBRA">Mano de obra</option><option value="MATERIAL">Material</option><option value="TRANSPORTE">Transporte</option><option value="OTRO">Otro</option></select></label><label>Importe (NIO)<input inputMode="decimal" disabled={saving} value={draft.importe} onChange={event => update('importe', event.currentTarget.value)} placeholder="0.00" required /></label>
        <label>Cliente (opcional)<select disabled={saving} value={draft.clienteId} onChange={event => update('clienteId', event.currentTarget.value)}><option value="">Sin cliente explícito</option>{shownClients.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label>
        <BusquedaSelector label="Buscar cliente" value={clientSearch} disabled={saving} onChange={value => { setClientSearch(value); setClientPage(1) }} /><div className="finanzas-selector-pages"><button type="button" disabled={saving || clientPage <= 1} onClick={() => setClientPage(value => value - 1)}>Anterior clientes</button><span>Página {clientPage} de {clientPages}</span><button type="button" disabled={saving || clientPage >= clientPages} onClick={() => setClientPage(value => value + 1)}>Siguiente clientes</button></div>
        <label>Orden de trabajo (opcional)<select disabled={saving} value={draft.ordenId} onChange={event => { const id = event.currentTarget.value; update('ordenId', id); setSelectedOrder(orders.find(order => String(order.id) === id) ?? null) }}><option value="">Sin orden vinculada</option>{shownOrders.map(order => <option key={order.id} value={order.id}>{order.numero} · {order.clienteNombreRegistrado}</option>)}</select></label>
        <div className="finanzas-selector-tools"><BusquedaSelector label="Buscar orden" value={orderSearch} disabled={saving} onChange={value => { setOrderSearch(value); setOrderPage(1); setOrders([]) }} />{orderHasMore && <Button type="button" disabled={saving || orderLoading} onClick={() => setOrderPage(value => value + 1)}>Cargar más órdenes</Button>}</div>
        <label>Comprobante (opcional)<select disabled={saving} value={draft.comprobanteId} onChange={event => { const id = event.currentTarget.value; update('comprobanteId', id); setSelectedInvoice(invoices.find(invoice => String(invoice.id) === id) ?? null) }}><option value="">Sin comprobante vinculado</option>{shownInvoices.filter(invoice => !invoice.anuladaEn).map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.referencia} · {invoice.clienteNombre}</option>)}</select></label>
        <div className="finanzas-selector-tools"><BusquedaSelector label="Buscar comprobante" value={invoiceSearch} disabled={saving} onChange={value => { setInvoiceSearch(value); setInvoicePage(1); setInvoices([]) }} />{invoiceHasMore && <Button type="button" disabled={saving || invoiceLoading} onClick={() => setInvoicePage(value => value + 1)}>Cargar más comprobantes</Button>}</div>
        <p>El cliente se toma de la orden o del comprobante seleccionado. Ambas referencias deben corresponder al mismo cliente. El costo puede quedar sin asignar.</p><label>Observación (opcional)<textarea maxLength={1000} disabled={saving} value={draft.observacion} onChange={event => update('observacion', event.currentTarget.value)} /></label>
      </>}
      <div className="h5-dialog__actions"><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant={mode === 'reverse' ? 'danger' : 'primary'} disabled={saving || (mode === 'create' ? !validCreate : !draft.fechaReversion || !draft.motivo.trim() || isoManagua(draft.fechaReversion) > now)} onClick={() => void (mode === 'create' ? submitCreate() : submitReverse())}>{saving ? 'Guardando…' : mode === 'create' ? 'Registrar costo' : 'Confirmar reversión'}</Button></div>
    </section>}
  </section>
}
