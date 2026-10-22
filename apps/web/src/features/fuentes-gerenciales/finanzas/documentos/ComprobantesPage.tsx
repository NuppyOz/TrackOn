import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { createIdempotencyKey } from '../../../../shared/idempotency'
import { listarClientes } from '../../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../../clientes/clientes.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { listarConceptos } from '../../../comercial/tarifas/tarifas.api'
import type { ConceptoComercial } from '../../../comercial/tarifas/tarifas.api'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { anularComprobante, crearComprobante, listarComprobantes, obtenerComprobante } from './documentos.api'
import type { Comprobante, ComprobanteNuevo, Pagina } from './documentos.types'
import '../../procedencia/h5-sources.css'
import './finanzas.css'

const LIMIT = 25
const localDate = (value: string) => new Date(new Date(value).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
const isoDate = (value: string) => new Date(`${value}:00-06:00`).toISOString()
const date = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
const money = (value: string) => `C$ ${value}`
const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.'
const randomKey = createIdempotencyKey
const cents = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0')) }
type DraftLine = { descripcion: string; importe: string; ordenId: string; conceptoId: string }
type Draft = { clienteId: string; referencia: string; emisor: string; emitidaEn: string; venceEn: string; importeFinal: string; observacion: string; motivo: string; lineas: DraftLine[] }
const emptyLine = (): DraftLine => ({ descripcion: '', importe: '', ordenId: '', conceptoId: '' })
const emptyDraft = (): Draft => ({ clienteId: '', referencia: '', emisor: '', emitidaEn: '', venceEn: '', importeFinal: '', observacion: '', motivo: '', lineas: [emptyLine()] })
type Mode = 'create' | 'annul' | null
type ComprobantesPageProps = Readonly<{ onBusyChange?: (busy: boolean) => void }>

export function ComprobantesPage({ onBusyChange }: ComprobantesPageProps = {}) {
  const [result, setResult] = useState<Pagina<Comprobante> | null>(null)
  const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>(null); const [draft, setDraft] = useState(emptyDraft()); const [detail, setDetail] = useState<Comprobante | null>(null)
  const [clients, setClients] = useState<Cliente[]>([]); const [clientSearch, setClientSearch] = useState(''); const [clientPage, setClientPage] = useState(1)
  const [conceptSearch, setConceptSearch] = useState(''); const [conceptPage, setConceptPage] = useState(1); const [concepts, setConcepts] = useState<ConceptoComercial[]>([]); const [conceptHasMore, setConceptHasMore] = useState(false); const [conceptLoading, setConceptLoading] = useState(false)
  const [orderSearch, setOrderSearch] = useState(''); const [orderPage, setOrderPage] = useState(1); const [orders, setOrders] = useState<OrdenResumen[]>([]); const [orderHasMore, setOrderHasMore] = useState(false)
  const request = useRef(0); const detailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null)
  useEffect(() => { onBusyChange?.(saving); return () => { if (saving) onBusyChange?.(false) } }, [saving, onBusyChange])
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError('')
    try { const data = await listarComprobantes({ q: q.trim() || undefined, pagina: page, limite: LIMIT }); if (current === request.current) setResult(data) }
    catch (cause) { if (current === request.current) setError(errorText(cause)) }
    finally { if (current === request.current) setLoading(false) }
  }, [q, page])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false; request.current += 1 } }, [load])
  useEffect(() => { let active = true; listarClientes().then(items => { if (active) setClients(items) }).catch(cause => { if (active) setError(errorText(cause)) }); return () => { active = false } }, [])
  useEffect(() => {
    if (!mode || mode !== 'create') return
    let active = true; queueMicrotask(() => { if (active) setConceptLoading(true) })
    listarConceptos({ q: conceptSearch.trim() || undefined, estado: 'activos', pagina: conceptPage, limite: LIMIT, sortBy: 'nombre', sortDir: 'asc' })
      .then(data => { if (active) { setConcepts(old => conceptPage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setConceptHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(errorText(cause)) }).finally(() => { if (active) setConceptLoading(false) })
    return () => { active = false }
  }, [mode, conceptSearch, conceptPage])
  useEffect(() => {
    if (mode !== 'create' || !draft.clienteId) return
    let active = true
    listarOrdenes({ estado: '', buscar: orderSearch, clienteId: draft.clienteId, pagina: orderPage, limite: LIMIT })
      .then(data => { if (active) { setOrders(old => orderPage === 1 ? data.items : [...old, ...data.items.filter(item => !old.some(existing => existing.id === item.id))]); setOrderHasMore(data.hayMas) } })
      .catch(cause => { if (active) setError(errorText(cause)) })
    return () => { active = false }
  }, [mode, draft.clienteId, orderSearch, orderPage])
  const update = (field: keyof Draft, value: string) => { intent.current = null; setDraft(current => ({ ...current, [field]: value, ...(field === 'clienteId' ? { lineas: current.lineas.map(line => ({ ...line, ordenId: '' })) } : {}) })); if (field === 'clienteId') { setOrders([]); setOrderPage(1) } }
  const updateLine = (index: number, field: keyof DraftLine, value: string) => { intent.current = null; setDraft(current => ({ ...current, lineas: current.lineas.map((line, i) => i === index ? { ...line, [field]: value } : line) })) }
  const openCreate = () => { detailRequest.current++; setDetail(null); setDraft(emptyDraft()); setMode('create'); setError(''); intent.current = null; setConcepts([]); setConceptPage(1); setConceptSearch(''); setOrders([]); setOrderPage(1); setOrderSearch(''); setClientPage(1); setClientSearch('') }
  const close = () => { if (!saving) { detailRequest.current++; setMode(null); setError('') } }
  const view = async (id: number) => { const current = ++detailRequest.current; setError(''); try { const record = await obtenerComprobante(id); if (current === detailRequest.current) { setDetail(record); setMode(null) } } catch (cause) { if (current === detailRequest.current) setError(errorText(cause)) } }
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; const raw = new URLSearchParams(window.location.search).get('comprobanteId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) void view(id) } }); return () => { active = false } }, [])
  const submitCreate = async () => {
    if (saving) return
    const payload: ComprobanteNuevo = {
      clienteId: Number(draft.clienteId), referencia: draft.referencia.trim().toUpperCase(), emisor: draft.emisor.trim().toUpperCase(),
      emitidaEn: isoDate(draft.emitidaEn), venceEn: isoDate(draft.venceEn), importeFinal: draft.importeFinal.trim(),
      lineas: draft.lineas.map(line => ({ descripcion: line.descripcion.trim(), importe: line.importe.trim(), ...(line.ordenId ? { ordenId: Number(line.ordenId) } : {}), ...(line.conceptoId ? { conceptoId: Number(line.conceptoId) } : {}) })),
      ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}),
    }
    const signature = JSON.stringify(payload); if (intent.current?.signature !== signature) intent.current = { signature, key: randomKey() }
    setSaving(true); setError('')
    try { await crearComprobante(payload, intent.current.key); intent.current = null; setMode(null); await load() } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }
  const submitAnnul = async () => {
    if (!detail || saving) return
    const payload = { version: detail.version, fechaEfectiva: isoDate(draft.emitidaEn), motivo: draft.motivo.trim() }
    const signature = JSON.stringify({ id: detail.id, ...payload }); if (intent.current?.signature !== signature) intent.current = { signature, key: randomKey() }
    setSaving(true); setError('')
    try { const updated = await anularComprobante(detail.id, payload, intent.current.key); intent.current = null; setDetail(updated); setMode(null); await load() } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }
  const openAnnul = () => { if (!detail) return; intent.current = null; setDraft({ ...emptyDraft(), emitidaEn: localDate(new Date().toISOString()) }); setMode('annul'); setError('') }
  const clientsFiltered = clients.filter(client => nombreCliente(client).toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()) || client.codigo.toLocaleLowerCase().includes(clientSearch.trim().toLocaleLowerCase()))
  const clientPages = Math.max(1, Math.ceil(clientsFiltered.length / LIMIT)); const shownClients = clientsFiltered.slice((clientPage - 1) * LIMIT, clientPage * LIMIT)
  const columns: DataTableColumn<Comprobante>[] = [
    { key: 'referencia', header: 'Comprobante', render: row => <button type="button" className="h5-link" onClick={() => void view(row.id)}>{row.referencia}</button> },
    { key: 'clienteNombre', header: 'Cliente', render: row => row.clienteNombre },
    { key: 'emisor', header: 'Emisor', render: row => row.emisor },
    { key: 'emitidaEn', header: 'Emisión', render: row => date(row.emitidaEn) },
    { key: 'saldo', header: 'Saldo', render: row => money(row.saldo) },
    { key: 'estado', header: 'Estado', render: row => <SemanticBadge label={row.anuladaEn ? 'Anulado' : 'Vigente'} variant={row.anuladaEn ? 'neutral' : 'success'} /> },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones de ${row.referencia}`}><button type="button" onClick={() => void view(row.id)}>Ver detalle</button></ActionMenu> },
  ]
  const validCreate = Boolean(draft.clienteId && draft.referencia.trim() && draft.emisor.trim() && draft.emitidaEn && draft.venceEn && isoDate(draft.venceEn) >= isoDate(draft.emitidaEn) && /^(0|[1-9]\d{0,13})(\.\d{1,2})?$/.test(draft.importeFinal) && cents(draft.importeFinal) > 0n && draft.lineas.length > 0 && draft.lineas.every(line => line.descripcion.trim() && /^(0|[1-9]\d{0,13})(\.\d{1,2})?$/.test(line.importe)) && draft.lineas.reduce((sum, line) => sum + cents(line.importe || '0'), 0n) === cents(draft.importeFinal || '0'))
  const canAnnul = Boolean(detail && !detail.anuladaEn && detail.saldo === detail.importeFinal)
  return <section className="h5-source" aria-labelledby="comprobantes-title">
    <ModuleHeader breadcrumb="Inteligencia / Registros financieros" title="Comprobantes" description="Registro de comprobantes externos con sus líneas y saldo. No emite facturas fiscales." action={!mode && !detail ? <Button variant="primary" onClick={openCreate}>Registrar comprobante</Button> : undefined} />
    {error && <p role="alert" className="h5-error">{error}</p>}
    {!mode && (detail ? <section className="h5-detail"><div className="h5-detail-head"><div><h2>{detail.referencia} · {detail.clienteNombre}</h2><SemanticBadge label={detail.anuladaEn ? 'Anulado' : 'Vigente'} variant={detail.anuladaEn ? 'neutral' : 'success'} /></div><Button onClick={() => setDetail(null)}>Volver al listado</Button></div>
      <dl><div><dt>Emisor</dt><dd>{detail.emisor}</dd></div><div><dt>Emisión</dt><dd>{date(detail.emitidaEn)}</dd></div><div><dt>Vencimiento</dt><dd>{date(detail.venceEn)}</dd></div><div><dt>Importe final</dt><dd>{money(detail.importeFinal)} NIO</dd></div><div><dt>Saldo</dt><dd>{money(detail.saldo)} NIO</dd></div><div><dt>Registrado</dt><dd>{date(detail.registradoEn)}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div>{detail.anuladaEn && <div><dt>Anulado</dt><dd>{date(detail.anuladaEn)} · {detail.motivoAnulacion}</dd></div>}</dl>
      <div className="finanzas-lines"><h3>Líneas del comprobante</h3><table><thead><tr><th>Descripción</th><th>Importe</th><th>Orden</th><th>Concepto</th></tr></thead><tbody>{(detail.lineas ?? []).map(line => <tr key={line.id}><td>{line.descripcion}</td><td>{money(line.importe)}</td><td>{line.ordenId ? `#${line.ordenId}` : '—'}</td><td>{line.conceptoId ? `#${line.conceptoId}` : '—'}</td></tr>)}</tbody></table></div>
      {detail.aplicaciones?.length ? <div className="finanzas-lines"><h3>Pagos asociados</h3><table><thead><tr><th>Referencia del cobro</th><th>Importe</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{detail.aplicaciones.map(item => <tr key={item.id}><td>{item.referencia}</td><td>{money(item.importe)}</td><td>{date(item.fechaEfectiva)}</td><td>{item.revertidoEn ? 'Revertido' : 'Vigente'}</td></tr>)}</tbody></table></div> : null}
      {detail.motivoAnulacion && <p>Motivo de anulación: {detail.motivoAnulacion}</p>}
      {!detail.anuladaEn && <div className="h5-detail-actions"><Button variant="danger" disabled={!canAnnul} onClick={openAnnul}>Anular comprobante</Button>{!canAnnul && <small>Solo se puede anular cuando no hay saldo aplicado.</small>}</div>}
    </section> : <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar comprobantes', placeholder: 'Referencia' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMIT, hayMas: result?.hayMas ?? false, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay comprobantes registrados" emptyDescription="Registra un comprobante externo para consultar su saldo." />)}
    {mode && <section className="h5-dialog h5-form-page" aria-labelledby="comprobante-form-title"><h2 id="comprobante-form-title">{mode === 'create' ? 'Registrar comprobante externo' : `Anular ${detail?.referencia ?? 'comprobante'}`}</h2>
      {mode === 'annul' ? <><p>El comprobante se conservará en el historial. Solo puede anularse si no tiene pagos aplicados.</p><label>Fecha efectiva<input type="datetime-local" disabled={saving} value={draft.emitidaEn} onChange={event => { intent.current = null; update('emitidaEn', event.currentTarget.value) }} required /></label><label>Motivo<textarea maxLength={1000} disabled={saving} value={draft.motivo} onChange={event => update('motivo', event.currentTarget.value)} required /></label></> : <>
        <label>Cliente<select disabled={saving} value={draft.clienteId} onChange={event => update('clienteId', event.currentTarget.value)} required><option value="">Selecciona un cliente</option>{shownClients.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label>
        <label>Buscar cliente<input type="search" disabled={saving} value={clientSearch} onChange={event => { setClientSearch(event.currentTarget.value); setClientPage(1) }} placeholder="Nombre o código" /></label><div className="finanzas-selector-pages"><button type="button" disabled={clientPage <= 1 || saving} onClick={() => setClientPage(clientPage - 1)}>Anterior clientes</button><span>Página {clientPage} de {clientPages}</span><button type="button" disabled={clientPage >= clientPages || saving} onClick={() => setClientPage(clientPage + 1)}>Siguiente clientes</button></div>
        <label>Referencia externa<input disabled={saving} maxLength={100} value={draft.referencia} onChange={event => update('referencia', event.currentTarget.value)} required /></label><label>Emisor<input disabled={saving} maxLength={100} value={draft.emisor} onChange={event => update('emisor', event.currentTarget.value)} required /></label>
        <div className="finanzas-grid"><label>Fecha de emisión<input disabled={saving} type="datetime-local" value={draft.emitidaEn} onChange={event => update('emitidaEn', event.currentTarget.value)} required /></label><label>Vence<input disabled={saving} type="datetime-local" value={draft.venceEn} onChange={event => update('venceEn', event.currentTarget.value)} required /></label><label>Importe final (NIO)<input disabled={saving} inputMode="decimal" value={draft.importeFinal} onChange={event => update('importeFinal', event.currentTarget.value)} placeholder="0.00" required /></label></div>
        <fieldset disabled={saving} className="finanzas-fieldset"><legend>Líneas de importe y asignación</legend>{draft.lineas.map((line, index) => <div className="finanzas-line-form" key={index}><label>Descripción<input maxLength={200} value={line.descripcion} onChange={event => updateLine(index, 'descripcion', event.currentTarget.value)} required /></label><label>Importe (NIO)<input inputMode="decimal" value={line.importe} onChange={event => updateLine(index, 'importe', event.currentTarget.value)} required /></label>
          <label>Orden de trabajo (opcional)<select disabled={!draft.clienteId} value={line.ordenId} onChange={event => updateLine(index, 'ordenId', event.currentTarget.value)}><option value="">Sin orden</option>{orders.map(order => <option key={order.id} value={order.id}>{order.numero} · {order.clienteNombreRegistrado}</option>)}</select></label>
          <label>Concepto (opcional)<select value={line.conceptoId} onChange={event => updateLine(index, 'conceptoId', event.currentTarget.value)}><option value="">Sin concepto</option>{concepts.map(concept => <option key={concept.id} value={concept.id}>{concept.codigo} · {concept.nombre}</option>)}</select></label>
          <Button type="button" disabled={draft.lineas.length <= 1} onClick={() => { intent.current = null; setDraft(current => ({ ...current, lineas: current.lineas.filter((_, i) => i !== index) })) }}>Quitar línea</Button></div>)}</fieldset>
        <div className="finanzas-selector-tools"><Button type="button" onClick={() => { intent.current = null; setDraft(current => ({ ...current, lineas: [...current.lineas, emptyLine()] })) }} disabled={saving || draft.lineas.length >= 100}>Agregar línea</Button><label>Buscar concepto<input type="search" disabled={saving} value={conceptSearch} onChange={event => { setConceptSearch(event.currentTarget.value); setConceptPage(1); setConcepts([]) }} placeholder="Código o nombre" /></label>{conceptHasMore && <Button type="button" disabled={conceptLoading || saving} onClick={() => setConceptPage(value => value + 1)}>{conceptLoading ? 'Cargando…' : 'Cargar más conceptos'}</Button>}{draft.clienteId && <><label>Buscar orden<input type="search" disabled={saving} value={orderSearch} onChange={event => { setOrderSearch(event.currentTarget.value); setOrderPage(1); setOrders([]) }} placeholder="Número o cliente" /></label>{orderHasMore && <Button type="button" disabled={saving} onClick={() => setOrderPage(value => value + 1)}>Cargar más órdenes</Button>}</>}</div>
        <p>Los importes se registran tal como aparecen en el comprobante; no se calculan impuestos.</p><label>Observación (opcional)<textarea maxLength={1000} disabled={saving} value={draft.observacion} onChange={event => update('observacion', event.currentTarget.value)} /></label>
      </>}
      <div className="h5-dialog__actions"><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant={mode === 'annul' ? 'danger' : 'primary'} onClick={() => void (mode === 'create' ? submitCreate() : submitAnnul())} disabled={saving || (mode === 'create' ? !validCreate : !draft.emitidaEn || !draft.motivo.trim())}>{saving ? 'Guardando…' : mode === 'create' ? 'Registrar comprobante' : 'Confirmar anulación'}</Button></div>
    </section>}
  </section>
}
