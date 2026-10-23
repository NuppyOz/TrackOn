import { BusquedaSelector } from '../cobros/BusquedaSelector'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../../clientes/clientes.types'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { listarComprobantes } from '../documentos/documentos.api'
import type { Comprobante } from '../documentos/documentos.types'
import { claveIntencion, centavos, dinero, dineroCentavos, fechaVisible, inputManagua, isoManagua, LIMITE_FINANZAS, textoError } from './finanzas-common'
import { crearCobro, listarCobros, obtenerCobro, revertirCobro } from './cobros.api'
import type { Cobro, CobroNuevo, Pagina } from './cobros.types'
import '../documentos/finanzas.css'
import './cobros.css'
import '../../procedencia/h5-sources.css'

type AplicacionDraft = { comprobanteId: string; importe: string }
type Draft = { clienteId: string; referencia: string; fechaEfectiva: string; observacion: string; motivo: string; fechaReversion: string; aplicaciones: AplicacionDraft[] }
const lineaVacia = (): AplicacionDraft => ({ comprobanteId: '', importe: '' })
const draftVacio = (): Draft => ({ clienteId: '', referencia: '', fechaEfectiva: '', observacion: '', motivo: '', fechaReversion: '', aplicaciones: [lineaVacia()] })
const MONTO = /^(0|[1-9]\d{0,13})(\.\d{1,2})?$/
const MAX_CENTAVOS = 9_999_999_999_999_999n
type Mode = 'create' | 'reverse' | null
type PageProps = Readonly<{ onBusyChange?: (busy: boolean) => void }>

export function CobrosPage({ onBusyChange }: PageProps = {}) {
  const [result, setResult] = useState<Pagina<Cobro> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>(null); const [draft, setDraft] = useState(draftVacio()); const [detail, setDetail] = useState<Cobro | null>(null)
  const [clients, setClients] = useState<Cliente[]>([]); const [clientSearch, setClientSearch] = useState(''); const [clientPage, setClientPage] = useState(1)
  const [invoiceSearch, setInvoiceSearch] = useState(''); const [invoicePage, setInvoicePage] = useState(1); const [invoices, setInvoices] = useState<Comprobante[]>([]); const [invoiceHasMore, setInvoiceHasMore] = useState(false); const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<Record<number, Comprobante>>({})
  const listRequest = useRef(0); const detailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null)
  useEffect(() => { onBusyChange?.(saving); return () => { if (saving) onBusyChange?.(false) } }, [saving, onBusyChange])
  const load = useCallback(async () => { const current = ++listRequest.current; setLoading(true); setError(''); try { const data = await listarCobros({ q: q.trim() || undefined, pagina: page, limite: LIMITE_FINANZAS }); if (current === listRequest.current) setResult(data) } catch (cause) { if (current === listRequest.current) setError(textoError(cause)) } finally { if (current === listRequest.current) setLoading(false) } }, [q, page])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false; listRequest.current += 1 } }, [load])
  useEffect(() => { let active = true; listarClientes().then(data => { if (active) setClients(data) }).catch(cause => { if (active) setError(textoError(cause)) }); return () => { active = false } }, [])
  useEffect(() => {
    if (mode !== 'create' || !draft.clienteId) return
    let active = true; queueMicrotask(() => { if (active) setInvoiceLoading(true) })
    listarComprobantes({ q: invoiceSearch.trim() || undefined, clienteId: Number(draft.clienteId), pagina: invoicePage, limite: LIMITE_FINANZAS })
      .then(data => { if (active) { setInvoices(old => invoicePage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setInvoiceHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(textoError(cause)) }).finally(() => { if (active) setInvoiceLoading(false) })
    return () => { active = false }
  }, [mode, draft.clienteId, invoiceSearch, invoicePage])
  const update = (field: keyof Draft, value: string) => { intent.current = null; setDraft(current => ({ ...current, [field]: value, ...(field === 'clienteId' ? { aplicaciones: [lineaVacia()] } : {}) })); if (field === 'clienteId') { setInvoices([]); setSelectedInvoices({}); setInvoicePage(1) } }
  const updateAplicacion = (index: number, field: keyof AplicacionDraft, value: string) => { intent.current = null; setDraft(current => ({ ...current, aplicaciones: current.aplicaciones.map((item, i) => i === index ? { ...item, [field]: value } : item) })) }
  const openCreate = () => { detailRequest.current++; intent.current = null; setDetail(null); setDraft(draftVacio()); setMode('create'); setError(''); setClientSearch(''); setClientPage(1); setInvoiceSearch(''); setInvoicePage(1); setInvoices([]); setSelectedInvoices({}) }
  const view = async (id: number) => { const current = ++detailRequest.current; setError(''); try { const record = await obtenerCobro(id); if (current === detailRequest.current) { setDetail(record); setMode(null) } } catch (cause) { if (current === detailRequest.current) setError(textoError(cause)) } }
  const close = () => { if (!saving) { detailRequest.current++; setMode(null); setError('') } }
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; const raw = new URLSearchParams(window.location.search).get('cobroId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) void view(id) } }); return () => { active = false } }, [])
  const openReverse = () => { if (!detail) return; intent.current = null; setDraft({ ...draftVacio(), fechaReversion: inputManagua(new Date().toISOString()) }); setMode('reverse'); setError('') }
  const submitCreate = async () => {
    if (saving) return
    const payload: CobroNuevo = { clienteId: Number(draft.clienteId), referencia: draft.referencia.trim().toUpperCase(), fechaEfectiva: isoManagua(draft.fechaEfectiva), aplicaciones: draft.aplicaciones.map(item => ({ comprobanteId: Number(item.comprobanteId), importe: item.importe.trim() })), ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}) }
    const signature = JSON.stringify(payload); if (intent.current?.signature !== signature) intent.current = { signature, key: claveIntencion() }
    setSaving(true); setError(''); try { await crearCobro(payload, intent.current.key); intent.current = null; setMode(null); await load() } catch (cause) { setError(textoError(cause)) } finally { setSaving(false) }
  }
  const submitReverse = async () => {
    if (!detail || saving) return
    const payload = { version: detail.version, fechaEfectiva: isoManagua(draft.fechaReversion), motivo: draft.motivo.trim() }
    const signature = JSON.stringify({ id: detail.id, ...payload }); if (intent.current?.signature !== signature) intent.current = { signature, key: claveIntencion() }
    setSaving(true); setError(''); try { const updated = await revertirCobro(detail.id, payload, intent.current.key); intent.current = null; setDetail(updated); setMode(null); await load() } catch (cause) { setError(textoError(cause)) } finally { setSaving(false) }
  }
  const clientesFiltrados = clients.filter(client => nombreCliente(client).toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()) || client.codigo.toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()))
  const paginasCliente = Math.max(1, Math.ceil(clientesFiltrados.length / LIMITE_FINANZAS)); const pageClients = clientesFiltrados.slice((clientPage - 1) * LIMITE_FINANZAS, clientPage * LIMITE_FINANZAS); const chosenClient = clients.find(client => String(client.id) === draft.clienteId); const clientesVisibles = chosenClient && !pageClients.some(client => client.id === chosenClient.id) ? [chosenClient, ...pageClients] : pageClients
  const docsValidos = [...Object.values(selectedInvoices), ...invoices].filter((invoice, index, all) => all.findIndex(item => item.id === invoice.id) === index && !invoice.anuladaEn && centavos(invoice.saldo) > 0n)
  const validApps = draft.aplicaciones.length > 0 && draft.aplicaciones.every(item => { const invoice = docsValidos.find(doc => String(doc.id) === item.comprobanteId); return Boolean(invoice && item.comprobanteId && MONTO.test(item.importe) && centavos(item.importe) > 0n && centavos(item.importe) <= centavos(invoice.saldo)) }) && new Set(draft.aplicaciones.map(item => item.comprobanteId)).size === draft.aplicaciones.length && draft.aplicaciones.reduce((sum, item) => sum + centavos(item.importe || '0'), 0n) <= MAX_CENTAVOS
  const now = new Date().toISOString()
  const validCreate = Boolean(draft.clienteId && draft.referencia.trim() && draft.fechaEfectiva && isoManagua(draft.fechaEfectiva) <= now && validApps)
  const columns: DataTableColumn<Cobro>[] = [
    { key: 'referencia', header: 'Cobro', render: row => <button type="button" className="h5-link" onClick={() => void view(row.id)}>{row.referencia}</button> },
    { key: 'clienteNombre', header: 'Cliente', render: row => row.clienteNombre },
    { key: 'fechaEfectiva', header: 'Fecha', render: row => fechaVisible(row.fechaEfectiva) },
    { key: 'importe', header: 'Importe', render: row => dinero(row.importe) },
    { key: 'estado', header: 'Estado', render: row => <SemanticBadge label={row.revertidoEn ? 'Revertido' : 'Aplicado'} variant={row.revertidoEn ? 'neutral' : 'success'} /> },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones del cobro ${row.referencia}`}><button type="button" onClick={() => void view(row.id)}>Ver detalle</button></ActionMenu> },
  ]
  const totalAplicado = draft.aplicaciones.reduce((sum, item) => sum + (MONTO.test(item.importe) ? centavos(item.importe) : 0n), 0n)
  return <section className="h5-source finanzas-h6" aria-labelledby="cobros-title">
    <ModuleHeader breadcrumb="Inteligencia / Registros financieros" title="Cobros" description="Registra pagos aplicados a comprobantes vigentes. El total se calcula a partir de las aplicaciones; no se registran anticipos." action={!mode && !detail ? <Button variant="primary" onClick={openCreate}>Registrar cobro</Button> : undefined} />
    {error && <p role="alert" className="h5-error">{error}</p>}
    {!mode && (detail ? <section className="h5-detail"><div className="h5-detail-head"><div><h2>{detail.referencia} · {detail.clienteNombre}</h2><SemanticBadge label={detail.revertidoEn ? 'Revertido' : 'Aplicado'} variant={detail.revertidoEn ? 'neutral' : 'success'} /></div><Button onClick={() => setDetail(null)}>Volver al listado</Button></div>
      <dl><div><dt>Fecha efectiva</dt><dd>{fechaVisible(detail.fechaEfectiva)}</dd></div><div><dt>Total aplicado</dt><dd>{dinero(detail.importe)} NIO</dd></div><div><dt>Registrado</dt><dd>{fechaVisible(detail.registradoEn)}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div>{detail.revertidoEn && <div><dt>Revertido</dt><dd>{fechaVisible(detail.revertidoEn)} · {detail.motivoReversion}</dd></div>}</dl>
      <div className="finanzas-lines"><h3>Comprobantes aplicados</h3><table><thead><tr><th>Comprobante</th><th>Importe aplicado</th></tr></thead><tbody>{(detail.aplicaciones ?? []).map(item => <tr key={item.id}><td>{item.comprobanteReferencia} · #{item.comprobanteId}</td><td>{dinero(item.importe)}</td></tr>)}</tbody></table></div>
      {!detail.revertidoEn && <div className="h5-detail-actions"><Button variant="danger" onClick={openReverse}>Revertir cobro</Button></div>}
    </section> : <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar cobros', placeholder: 'Referencia' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMITE_FINANZAS, hayMas: result?.hayMas ?? false, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay cobros registrados" emptyDescription="Registra un cobro aplicado a uno o más comprobantes." />)}
    {mode && <section className="h5-dialog h5-form-page" aria-labelledby="cobro-form-title"><h2 id="cobro-form-title">{mode === 'create' ? 'Registrar cobro aplicado' : `Revertir ${detail?.referencia ?? 'cobro'}`}
      </h2>{mode === 'reverse' ? <><p>El registro original se conservará y sus aplicaciones dejarán de reducir los saldos.</p><label>Fecha de reversión<input type="datetime-local" min={detail ? inputManagua(detail.fechaEfectiva) : undefined} max={inputManagua(now)} disabled={saving} value={draft.fechaReversion} onChange={event => update('fechaReversion', event.currentTarget.value)} required /></label><label>Motivo<textarea maxLength={1000} disabled={saving} value={draft.motivo} onChange={event => update('motivo', event.currentTarget.value)} required /></label></> : <>
        <label>Cliente<select disabled={saving} value={draft.clienteId} onChange={event => update('clienteId', event.currentTarget.value)} required><option value="">Selecciona un cliente</option>{clientesVisibles.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label>
        <BusquedaSelector label="Buscar cliente" value={clientSearch} disabled={saving} onChange={value => { setClientSearch(value); setClientPage(1) }} /><div className="finanzas-selector-pages"><button type="button" disabled={saving || clientPage <= 1} onClick={() => setClientPage(value => value - 1)}>Anterior clientes</button><span>Página {clientPage} de {paginasCliente}</span><button type="button" disabled={saving || clientPage >= paginasCliente} onClick={() => setClientPage(value => value + 1)}>Siguiente clientes</button></div>
        <label>Referencia<input maxLength={100} disabled={saving} value={draft.referencia} onChange={event => update('referencia', event.currentTarget.value)} required /></label><label>Fecha efectiva<input type="datetime-local" disabled={saving} value={draft.fechaEfectiva} onChange={event => update('fechaEfectiva', event.currentTarget.value)} required /></label>
        <fieldset disabled={saving} className="finanzas-fieldset"><legend>Aplicaciones a comprobantes</legend>{draft.aplicaciones.map((item, index) => <div className="finanzas-line-form" key={index}>
          <label>Comprobante<select disabled={!draft.clienteId} value={item.comprobanteId} onChange={event => { const id = event.currentTarget.value; updateAplicacion(index, 'comprobanteId', id); const selected = docsValidos.find(invoice => String(invoice.id) === id); if (selected) setSelectedInvoices(current => ({ ...current, [selected.id]: selected })) }} required><option value="">Selecciona comprobante</option>{docsValidos.map(invoice => <option key={invoice.id} value={invoice.id} disabled={draft.aplicaciones.some((other, i) => i !== index && other.comprobanteId === String(invoice.id))}>{invoice.referencia} · saldo C$ {invoice.saldo}</option>)}</select></label>
          <label>Importe aplicado<input inputMode="decimal" value={item.importe} onChange={event => updateAplicacion(index, 'importe', event.currentTarget.value)} placeholder="0.00" required /></label>
          <Button type="button" disabled={draft.aplicaciones.length <= 1} onClick={() => { intent.current = null; setDraft(current => ({ ...current, aplicaciones: current.aplicaciones.filter((_, i) => i !== index) })) }}>Quitar aplicación</Button>
        </div>)}</fieldset>
        <div className="finanzas-selector-tools"><BusquedaSelector label="Buscar comprobante" value={invoiceSearch} disabled={saving || !draft.clienteId} onChange={value => { setInvoiceSearch(value); setInvoicePage(1); setInvoices([]) }} />{invoiceHasMore && <Button type="button" disabled={saving || invoiceLoading} onClick={() => setInvoicePage(value => value + 1)}>{invoiceLoading ? 'Cargando…' : 'Cargar más comprobantes'}</Button>}<Button type="button" disabled={saving || draft.aplicaciones.length >= 100} onClick={() => { intent.current = null; setDraft(current => ({ ...current, aplicaciones: [...current.aplicaciones, lineaVacia()] })) }}>Agregar comprobante</Button></div>
        <p aria-live="polite">Total aplicado: {dinero(dineroCentavos(totalAplicado))}. El total corresponde a los importes aplicados.</p><label>Observación (opcional)<textarea maxLength={1000} disabled={saving} value={draft.observacion} onChange={event => update('observacion', event.currentTarget.value)} /></label>
      </>}
      <div className="h5-dialog__actions"><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant={mode === 'reverse' ? 'danger' : 'primary'} disabled={saving || (mode === 'create' ? !validCreate : !draft.fechaReversion || !draft.motivo.trim() || isoManagua(draft.fechaReversion) > now)} onClick={() => void (mode === 'create' ? submitCreate() : submitReverse())}>{saving ? 'Guardando…' : mode === 'create' ? 'Registrar cobro' : 'Confirmar reversión'}</Button></div>
    </section>}
  </section>
}
