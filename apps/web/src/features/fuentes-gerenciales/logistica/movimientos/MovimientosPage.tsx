import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { listarArticulos } from '../articulos/articulos.api'
import type { Articulo } from '../articulos/articulos.types'
import { listarOrdenes } from '../../../ordenes/ordenes.api'
import type { OrdenResumen } from '../../../ordenes/ordenes.types'
import { aEntradaManagua, aIsoManagua, fechaVisible } from './fechas'
import { crearMovimiento, listarMovimientos, obtenerMovimiento, revertirMovimiento } from './movimientos.api'
import type { Movimiento, MovimientoNuevo, Pagina, ReversionNueva, TipoMovimiento } from './movimientos.types'
import '../articulos/logistica.css'

const LIMITE = 25
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const keyIntention = () => globalThis.crypto.randomUUID()
const qty = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/
const unitCost = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,6})?$/
const groupDecimal = (value: string) => { const [whole, fraction] = value.split('.'); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}` }
const types: Array<{ value: Exclude<TipoMovimiento, 'APERTURA' | 'REVERSO'>; label: string }> = [
  { value: 'ENTRADA', label: 'Entrada' }, { value: 'CONSUMO', label: 'Consumo' }, { value: 'DEVOLUCION', label: 'Devolución' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste positivo' }, { value: 'AJUSTE_NEGATIVO', label: 'Ajuste negativo' },
]
const movementLabel = (row: Movimiento) => row.sentido === 1 ? 'Entrada' : 'Salida'
const typeLabel: Record<TipoMovimiento, string> = { APERTURA: 'Apertura', ENTRADA: 'Entrada', CONSUMO: 'Consumo', DEVOLUCION: 'Devolución', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo', REVERSO: 'Reverso' }
type Mode = 'create' | 'reverse' | null
type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>

export function MovimientosPage({ onBusyChange }: Props = {}) {
  const [result, setResult] = useState<Pagina<Movimiento> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Movimiento | null>(null); const [mode, setMode] = useState<Mode>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [articles, setArticles] = useState<Articulo[]>([]); const [articleQ, setArticleQ] = useState(''); const [articlePage, setArticlePage] = useState(1); const [articleMore, setArticleMore] = useState(false); const [chosenArticle, setChosenArticle] = useState<Articulo | null>(null)
  const [originQ, setOriginQ] = useState(''); const [originPage, setOriginPage] = useState(1); const [origins, setOrigins] = useState<Movimiento[]>([]); const [originMore, setOriginMore] = useState(false); const [chosenOrigin, setChosenOrigin] = useState<Movimiento | null>(null)
  const [orders, setOrders] = useState<OrdenResumen[]>([]); const [orderQ, setOrderQ] = useState(''); const [orderPage, setOrderPage] = useState(1); const [orderMore, setOrderMore] = useState(false); const [chosenOrder, setChosenOrder] = useState<OrdenResumen | null>(null)
  const [tipo, setTipo] = useState<Exclude<TipoMovimiento, 'APERTURA' | 'REVERSO'>>('ENTRADA'); const [reference, setReference] = useState(''); const [effective, setEffective] = useState(''); const [quantity, setQuantity] = useState(''); const [cost, setCost] = useState(''); const [observation, setObservation] = useState('')
  const [reverseRef, setReverseRef] = useState(''); const [reverseDate, setReverseDate] = useState(''); const [reverseNote, setReverseNote] = useState('')
  const request = useRef(0); const detailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null); const lock = useRef(false)
  const load = useCallback(async (nextPage = page) => {
    const id = ++request.current; setLoading(true); setError('')
    try { const data = await listarMovimientos({ q: q.trim().slice(0, 100) || undefined, pagina: nextPage, limite: LIMITE }); if (id === request.current) { setResult(data); setPage(data.pagina) } }
    catch (cause) { if (id === request.current) setError(errorMessage(cause)) }
    finally { if (id === request.current) setLoading(false) }
  }, [page, q])
  useEffect(() => { let live = true; queueMicrotask(() => { if (live) void load() }); return () => { live = false; request.current += 1 } }, [load])
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
  useEffect(() => {
    let live = true
    listarArticulos({ q: articleQ.trim().slice(0, 100) || undefined, pagina: articlePage, limite: LIMITE }).then(data => {
      if (live) { setArticles(previous => articlePage === 1 ? data.items : mergeById(previous, data.items)); setArticleMore(data.hayMas) }
    }).catch(cause => { if (live) setError(errorMessage(cause)) })
    return () => { live = false }
  }, [articleQ, articlePage])
  const chosenArticleId = chosenArticle?.id
  useEffect(() => {
    if (chosenArticleId === undefined) return
    let live = true
    listarMovimientos({ articuloId: chosenArticleId, q: originQ.trim().slice(0, 100) || undefined, pagina: originPage, limite: LIMITE }).then(data => {
      if (live) { setOrigins(previous => originPage === 1 ? data.items.filter(item => item.tipo === 'CONSUMO') : mergeById(previous, data.items.filter(item => item.tipo === 'CONSUMO'))); setOriginMore(data.hayMas) }
    }).catch(cause => { if (live) setError(errorMessage(cause)) })
    return () => { live = false }
  }, [chosenArticleId, originQ, originPage])
  useEffect(() => {
    if (tipo !== 'CONSUMO') return
    let live = true
    listarOrdenes({ estado: '', buscar: orderQ.trim().slice(0, 100), pagina: orderPage, limite: LIMITE }).then(data => {
      if (live) { setOrders(previous => orderPage === 1 ? data.items : mergeById(previous, data.items)); setOrderMore(data.hayMas) }
    }).catch(cause => { if (live) setError(errorMessage(cause)) })
    return () => { live = false }
  }, [tipo, orderQ, orderPage])
  const open = useCallback(async (id: number) => {
    if (lock.current) return
    const requestId = ++detailRequest.current
    setLoading(true); setError('')
    try { const value = await obtenerMovimiento(id); if (requestId === detailRequest.current) { setDetail(value); setMode(null); setNotice('') } }
    catch (cause) { if (requestId === detailRequest.current) setError(errorMessage(cause)) }
    finally { if (requestId === detailRequest.current) setLoading(false) }
  }, [])
  useEffect(() => {
    let live = true
    const raw = new URLSearchParams(window.location.search).get('movimientoId')
    if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) queueMicrotask(() => { if (live) void open(id) }) }
    return () => { live = false }
  }, [open])
  const resetDraft = () => { setChosenArticle(null); setChosenOrigin(null); setChosenOrder(null); setOrders([]); setTipo('ENTRADA'); setReference(''); setEffective(''); setQuantity(''); setCost(''); setObservation(''); setOriginPage(1); setOriginQ(''); setOrderPage(1); setOrderQ(''); setArticlePage(1); setArticleQ('') }
  const beginCreate = () => { intent.current = null; resetDraft(); setDetail(null); setMode('create'); setError(''); setNotice('') }
  const beginReverse = () => {
    if (!detail?.puedeRevertir || busy) return
    intent.current = null; setReverseRef(''); setReverseDate(aEntradaManagua(new Date().toISOString())); setReverseNote(''); setMode('reverse'); setError('')
  }
  const signatureKey = (operation: string, id: number | null, payload: unknown) => {
    const signature = JSON.stringify([operation, id, payload])
    if (intent.current?.signature !== signature) intent.current = { signature, key: keyIntention() }
    return intent.current.key
  }
  const submitCreate = async () => {
    if (lock.current || busy) return
    const fechaEfectiva = aIsoManagua(effective)
    if (!chosenArticle || !types.some(item => item.value === tipo) || !reference.trim() || reference.trim().length > 100 || !fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now() || !qty.test(quantity) || Number(quantity) <= 0 || !observation.trim() || observation.trim().length > 1000) { setError('Completa artículo, tipo, referencia, fecha válida, cantidad positiva (hasta 3 decimales) y observación (hasta 1000).'); return }
    if (chosenArticle.ultimaFecha && new Date(fechaEfectiva).getTime() < new Date(chosenArticle.ultimaFecha).getTime()) { setError('La fecha debe ser igual o posterior al último movimiento de este artículo.'); return }
    if ((tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO') && !unitCost.test(cost)) { setError('El costo unitario es obligatorio y admite hasta 6 decimales.'); return }
    if (tipo === 'DEVOLUCION' && (!chosenOrigin || chosenOrigin.tipo !== 'CONSUMO' || chosenOrigin.articuloId !== chosenArticle.id)) { setError('Selecciona un consumo de este artículo como origen de devolución.'); return }
    const payload: MovimientoNuevo = { articuloId: chosenArticle.id, tipo, referencia: reference.trim().toUpperCase(), fechaEfectiva, cantidad: quantity, ...((tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO') ? { costoUnitario: cost } : {}), ...(tipo === 'DEVOLUCION' && chosenOrigin ? { origenId: chosenOrigin.id } : {}), ...(tipo === 'CONSUMO' && chosenOrder ? { ordenId: chosenOrder.id } : {}), observacion: observation.trim() }
    const key = signatureKey('movimiento:crear', null, payload)
    lock.current = true; setBusy(true); setError('')
    try { const created = await crearMovimiento(payload, key); intent.current = null; setDetail(created); setMode(null); setNotice('Movimiento registrado. El saldo y el costo fueron calculados al registrar.'); await load(1) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { lock.current = false; setBusy(false) }
  }
  const submitReverse = async () => {
    if (!detail?.puedeRevertir || lock.current || busy) return
    const fechaEfectiva = aIsoManagua(reverseDate)
    if (!reverseRef.trim() || reverseRef.trim().length > 100 || !fechaEfectiva || new Date(fechaEfectiva).getTime() > Date.now() || (detail.fechaEfectiva && new Date(fechaEfectiva).getTime() < new Date(detail.fechaEfectiva).getTime()) || !reverseNote.trim() || reverseNote.trim().length > 1000) { setError('Completa referencia, fecha válida posterior al movimiento y motivo (hasta 1000).'); return }
    if (!window.confirm(`Se registrará un reverso de ${detail.referencia} con fecha ${fechaVisible(fechaEfectiva)} y motivo: ${reverseNote.trim()}. El original permanecerá en el historial. ¿Continuar?`)) return
    const payload: ReversionNueva = { referencia: reverseRef.trim().toUpperCase(), fechaEfectiva, observacion: reverseNote.trim() }
    const key = signatureKey(`movimiento:revertir:${detail.id}`, detail.id, payload)
    lock.current = true; setBusy(true); setError('')
    try { const reversed = await revertirMovimiento(detail.id, payload, key); intent.current = null; setDetail(reversed); setMode(null); setNotice('El reverso quedó registrado como un movimiento nuevo.'); await load(1) }
    catch (cause) { setError(errorMessage(cause)) }
    finally { lock.current = false; setBusy(false) }
  }
  const viewDetail = (id: number) => { void open(id) }
  const columns: DataTableColumn<Movimiento>[] = [
    { key: 'referencia', header: 'Referencia', render: row => <button type="button" className="logistica__link" onClick={() => void viewDetail(row.id)}>{row.referencia}</button> },
    { key: 'articulo', header: 'Artículo', render: row => `${row.articuloCodigo} · ${row.articuloNombre}` },
    { key: 'tipo', header: 'Movimiento', render: row => <SemanticBadge label={`${movementLabel(row)} · ${typeLabel[row.tipo]}`} icon={row.sentido === 1 ? '+' : '−'} variant={row.sentido === 1 ? 'success' : 'warning'} /> },
    { key: 'fecha', header: 'Fecha efectiva', render: row => fechaVisible(row.fechaEfectiva) },
    { key: 'cantidad', header: 'Cantidad', render: row => `${row.sentido < 0 ? '−' : '+'}${row.cantidad} ${row.unidad}`, align: 'end' },
    { key: 'valor', header: 'Valor (NIO)', render: row => `${row.sentido < 0 ? '−' : '+'}${groupDecimal(row.valor)}`, align: 'end' },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones de ${row.referencia}`}><button type="button" disabled={busy} onClick={() => void viewDetail(row.id)}>Ver detalle</button>{row.puedeRevertir && <button type="button" disabled={busy} onClick={() => void viewDetail(row.id)}>Revertir movimiento</button>}</ActionMenu> },
  ]
  const chosenArticles = chosenArticle && !articles.some(item => item.id === chosenArticle.id) ? [chosenArticle, ...articles] : articles
  const chosenOrigins = chosenOrigin && !origins.some(item => item.id === chosenOrigin.id) ? [chosenOrigin, ...origins] : origins
  const header = <ModuleHeader breadcrumb="Fuentes gerenciales / Logística" title={detail ? `Movimiento ${detail.referencia}` : mode === 'create' ? 'Nuevo movimiento' : mode === 'reverse' ? 'Revertir movimiento' : 'Movimientos'} description="Historial de entradas, salidas y correcciones de artículos." action={!mode && !detail ? <Button variant="primary" disabled={busy} onClick={beginCreate}>Registrar movimiento</Button> : undefined} />
  return <section className="fuentes-scope logistica" aria-label="Movimientos logísticos">
    {header}{notice && <p role="status" className="logistica__notice">{notice}</p>}{error && <p role="alert" className="logistica__error">{error}</p>}
    {mode === 'create' && <section className="logistica__panel"><h2>Registrar movimiento</h2><form aria-label="Nuevo movimiento" onSubmit={event => { event.preventDefault(); void submitCreate() }}>
      <fieldset disabled={busy}><legend>Datos del movimiento</legend>
        <label>Buscar artículo<input value={articleQ} maxLength={100} onChange={event => { setArticleQ(event.target.value); setArticlePage(1) }} /></label>
        <label>Artículo<select aria-label="Artículo" value={chosenArticle ? String(chosenArticle.id) : ''} onChange={event => { const article = articles.find(item => String(item.id) === event.target.value) ?? null; setChosenArticle(article); setChosenOrigin(null); setOrigins([]); setOriginPage(1) }} required><option value="">Selecciona artículo</option>{chosenArticles.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre} ({item.unidad})</option>)}</select></label>
        {articleMore && <Button type="button" onClick={() => setArticlePage(value => value + 1)}>Más artículos</Button>}
        {chosenArticle && <p>Último movimiento: {fechaVisible(chosenArticle.ultimaFecha)}. El siguiente registro debe usar esa fecha o una posterior.</p>}
        <label>Tipo<select aria-label="Tipo de movimiento" value={tipo} onChange={event => { setTipo(event.target.value as typeof tipo); setChosenOrigin(null) }} required>{types.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {tipo === 'CONSUMO' && <><label>Buscar orden de trabajo<input value={orderQ} maxLength={100} onChange={event => { setOrderQ(event.target.value); setOrderPage(1) }} /></label><label>Orden de trabajo (opcional)<select aria-label="Orden de trabajo" value={chosenOrder ? String(chosenOrder.id) : ''} onChange={event => setChosenOrder(orders.find(item => String(item.id) === event.target.value) ?? null)}><option value="">Sin orden vinculada</option>{chosenOrder && !orders.some(item => item.id === chosenOrder.id) && <option value={chosenOrder.id}>{chosenOrder.numero} · {chosenOrder.clienteNombreRegistrado}</option>}{orders.map(item => <option key={item.id} value={item.id}>{item.numero} · {item.clienteNombreRegistrado} · {item.estadoCodigo}</option>)}</select></label>{orderMore && <Button type="button" onClick={() => setOrderPage(value => value + 1)}>Más órdenes</Button>}</>}
        <label>Referencia<input value={reference} maxLength={100} onChange={event => setReference(event.target.value)} required /></label>
        <label>Fecha efectiva<input type="datetime-local" step="1" value={effective} onChange={event => setEffective(event.target.value)} required /></label>
        <label>Cantidad<input inputMode="decimal" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="0.000" required /></label>
        {(tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO') && <label>Costo unitario (hasta 6 decimales)<input inputMode="decimal" value={cost} onChange={event => setCost(event.target.value)} required /></label>}
        {tipo === 'DEVOLUCION' && <><label>Buscar consumo de origen<input value={originQ} maxLength={100} onChange={event => { setOriginQ(event.target.value); setOriginPage(1) }} /></label><label>Consumo de origen<select aria-label="Consumo de origen" value={chosenOrigin ? String(chosenOrigin.id) : ''} onChange={event => setChosenOrigin(origins.find(item => String(item.id) === event.target.value) ?? null)} required><option value="">Selecciona consumo</option>{chosenOrigins.map(item => <option key={item.id} value={item.id}>{item.referencia} · {fechaVisible(item.fechaEfectiva)} · {item.cantidad} {item.unidad}</option>)}</select></label>{originMore && <Button type="button" onClick={() => setOriginPage(value => value + 1)}>Más consumos</Button>}</>}
        <label>Observación (obligatoria)<textarea maxLength={1000} value={observation} onChange={event => setObservation(event.target.value)} required /></label>
      </fieldset><div className="logistica__actions"><Button variant="primary" type="submit" loading={busy}>Registrar movimiento</Button><Button type="button" disabled={busy} onClick={() => { intent.current = null; setMode(null) }}>Cancelar</Button></div>
    </form></section>}
    {mode === 'reverse' && detail && <section className="logistica__panel"><h2>Revertir {detail.referencia}</h2><p>Se agregará un movimiento compensatorio y se conservará este hecho original.</p>{!detail.puedeRevertir && <p role="alert">Este movimiento ya no admite reversión.</p>}<form aria-label="Revertir movimiento" onSubmit={event => { event.preventDefault(); void submitReverse() }}><fieldset disabled={busy || !detail.puedeRevertir}><label>Referencia del reverso<input maxLength={100} value={reverseRef} onChange={event => setReverseRef(event.target.value)} required /></label><label>Fecha efectiva<input type="datetime-local" step="1" min={aEntradaManagua(detail.fechaEfectiva)} value={reverseDate} onChange={event => setReverseDate(event.target.value)} required /></label><label>Motivo / observación<textarea maxLength={1000} value={reverseNote} onChange={event => setReverseNote(event.target.value)} required /></label></fieldset><div className="logistica__actions"><Button variant="danger" type="submit" disabled={busy || !detail.puedeRevertir}>Confirmar reversión</Button><Button type="button" disabled={busy} onClick={() => { intent.current = null; setMode(null) }}>Cancelar</Button></div></form></section>}
    {!mode && detail && <section className="logistica__panel"><div className="logistica__detail-head"><div><h2>{detail.referencia} · {detail.articuloCodigo}</h2><SemanticBadge label={`${movementLabel(detail)} · ${typeLabel[detail.tipo]}`} icon={detail.sentido === 1 ? '+' : '−'} variant={detail.sentido === 1 ? 'success' : 'warning'} /></div><div className="logistica__actions">{detail.puedeRevertir && <Button variant="danger" disabled={busy} onClick={beginReverse}>Revertir movimiento</Button>}<Button disabled={busy} onClick={() => setDetail(null)}>Volver a movimientos</Button></div></div>
      <dl className="logistica__facts"><div><dt>Artículo</dt><dd>{detail.articuloNombre} · {detail.unidad}</dd></div><div><dt>Cantidad del movimiento</dt><dd>{detail.sentido < 0 ? '−' : '+'}{detail.cantidad} {detail.unidad}</dd></div><div><dt>Valor congelado</dt><dd>{detail.sentido < 0 ? '−' : '+'}{groupDecimal(detail.valor)} NIO</dd></div><div><dt>Saldo posterior</dt><dd>{detail.saldoCantidad} {detail.unidad}</dd></div><div><dt>Valor de saldo</dt><dd>{groupDecimal(detail.saldoValor)} NIO</dd></div><div><dt>Fecha efectiva</dt><dd>{fechaVisible(detail.fechaEfectiva)}</dd></div><div><dt>Registrado</dt><dd>{fechaVisible(detail.registradoEn)}</dd></div><div><dt>Origen de consumo</dt><dd>{detail.origenId ?? '—'}</dd></div><div><dt>Orden de trabajo</dt><dd>{detail.ordenId ?? '—'}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div></dl>
    </section>}
    {!mode && !detail && <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar movimientos', placeholder: 'Referencia o artículo' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMITE, hayMas: result?.hayMas ?? false, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay movimientos registrados" emptyDescription="Registra entradas, consumos, devoluciones o ajustes." />}
  </section>
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const values = new Map(current.map(item => [item.id, item]))
  incoming.forEach(item => values.set(item.id, item))
  return [...values.values()]
}
