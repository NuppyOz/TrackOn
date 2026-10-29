import './compras.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { DataTable, ModuleHeader, type DataTableColumn } from '../../../erp-ui/components'
import { fechaVisible } from '../articulos/fechas'
import { cancelarPendienteCompra, crearCompra, listarCompras, obtenerCompra, recibirLineaCompra } from './compras.api'
import { CompraDetalle } from './CompraDetalle'
import { CompraForm } from './CompraForm'
import type { CancelacionNueva, Compra, CompraNueva, CompraResumen, Pagina, RecepcionNueva } from './compras.types'

const LIMIT = 25
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
export function ComprasGerencialesPage({ onBusyChange }: Props = {}) {
  const [result, setResult] = useState<Pagina<CompraResumen> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Compra | null>(null); const [creating, setCreating] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const request = useRef(0); const detailRequest = useRef(0); const lock = useRef(false); const intent = useRef<{ signature: string; key: string } | null>(null)
  const load = useCallback(async (nextPage = page) => { const token = ++request.current; setLoading(true); setError(''); try { const data = await listarCompras(q.trim().slice(0, 100), nextPage, LIMIT); if (token === request.current) { setResult(data); setPage(data.pagina) } } catch (cause) { if (token === request.current) setError(errorText(cause)) } finally { if (token === request.current) setLoading(false) } }, [page, q])
  useEffect(() => { let live = true; queueMicrotask(() => { if (live) void load() }); return () => { live = false; request.current += 1 } }, [load])
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
  const open = useCallback(async (id: number) => { if (lock.current) return; const token = ++detailRequest.current; setLoading(true); setError(''); try { const value = await obtenerCompra(id); if (token === detailRequest.current) { setDetail(value); setCreating(false); setNotice('') } } catch (cause) { if (token === detailRequest.current) setError(errorText(cause)) } finally { if (token === detailRequest.current) setLoading(false) } }, [])
  useEffect(() => { let live = true; const raw = new URLSearchParams(window.location.search).get('compraId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) queueMicrotask(() => { if (live) void open(id) }) }; return () => { live = false } }, [open])
  const keyFor = (operation: string, id: number | null, payload: unknown) => { const signature = JSON.stringify([operation, id, payload]); if (intent.current?.signature !== signature) intent.current = { signature, key: crypto.randomUUID() }; return intent.current.key }
  const mutate = async <T,>(operation: string, id: number | null, payload: T, run: (key: string) => Promise<Compra>) => {
    if (lock.current || busy) return false
    detailRequest.current += 1
    const key = keyFor(operation, id, payload); lock.current = true; setBusy(true); setError('')
    try { const updated = await run(key); intent.current = null; setDetail(updated); setNotice(operation === 'compra:crear' ? 'Compromiso de compra registrado.' : operation.startsWith('compra:recibir') ? 'Recepción registrada y saldo actualizado.' : 'Cantidad pendiente cancelada; las recepciones se conservaron.'); if (operation === 'compra:crear') setCreating(false); await load(1); return true }
    catch (cause) { setError(errorText(cause)); return false }
    finally { lock.current = false; setBusy(false) }
  }
  const save = (payload: CompraNueva) => mutate('compra:crear', null, payload, key => crearCompra(payload, key))
  const receive = (lineId: number, payload: RecepcionNueva) => mutate('compra:recibir', lineId, payload, key => recibirLineaCompra(lineId, payload, key))
  const cancelPending = (lineId: number, payload: CancelacionNueva) => mutate('compra:cancelar-pendiente', lineId, payload, key => cancelarPendienteCompra(lineId, payload, key))
  const beginCreate = () => { if (busy) return; detailRequest.current += 1; intent.current = null; setDetail(null); setCreating(true); setError(''); setNotice('') }
  const columns: DataTableColumn<CompraResumen>[] = [
    { key: 'referencia', header: 'Referencia', render: row => <button type="button" className="logistica__link" disabled={busy} onClick={() => void open(row.id)}>{row.referencia}</button> },
    { key: 'proveedor', header: 'Proveedor', render: row => row.proveedor },
    { key: 'fecha', header: 'Fecha efectiva', render: row => fechaVisible(row.fechaEfectiva) },
    { key: 'registrada', header: 'Registrada', render: row => fechaVisible(row.registradoEn) },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones de compra ${row.referencia}`}><button type="button" disabled={busy} onClick={() => void open(row.id)}>Ver detalle</button></ActionMenu> },
  ]
  const header = <ModuleHeader breadcrumb="Fuentes gerenciales / Logística" title={detail ? `Compra ${detail.referencia}` : creating ? 'Nuevo compromiso de compra' : 'Compras'} description="Compromisos con proveedores y recepciones físicas registradas." action={!creating && !detail ? <Button variant="primary" disabled={busy} onClick={beginCreate}>Registrar compra</Button> : undefined} />
  return <section className="fuentes-scope logistica logistica-b2" aria-label="Compras gerenciales">{header}{notice && <p role="status" className="logistica__notice">{notice}</p>}{error && <p role="alert" className="logistica__error">{error}</p>}
    {creating && <CompraForm busy={busy} onSave={save} onCancel={() => { if (!busy) { intent.current = null; setCreating(false) } }} />}
    {!creating && detail && <CompraDetalle compra={detail} busy={busy} onBack={() => { if (!busy) { detailRequest.current += 1; setDetail(null); setError('') } }} onReceive={receive} onCancelPending={cancelPending} />}
    {!creating && !detail && <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, label: 'Buscar compras', placeholder: 'Proveedor o referencia', onChange: value => { setQ(value.slice(0, 100)); setPage(1) } }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMIT, hayMas: result?.hayMas ?? false, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay compromisos de compra" emptyDescription="Registra una compra para dar seguimiento a cantidades prometidas y recibidas." />}
  </section>
}
