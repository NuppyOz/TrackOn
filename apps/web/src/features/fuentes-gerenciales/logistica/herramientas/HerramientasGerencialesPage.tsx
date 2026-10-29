import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { fechaVisible } from '../articulos/fechas'
import { crearHerramienta, devolverPrestamoHerramienta, listarHerramientas, obtenerHerramienta, prestarHerramienta } from './herramientas.api'
import { HerramientaDetalle } from './HerramientaDetalle'
import { HerramientaForm } from './HerramientaForm'
import type { DevolucionNueva, Herramienta, HerramientaNueva, HerramientaResumen, Pagina, PrestamoNuevo } from './herramientas.types'
import './herramientas.css'
const LIMIT = 25
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
type Mode = 'loan' | 'return' | null
type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
export function HerramientasGerencialesPage({ onBusyChange }: Props = {}) {
  const [result, setResult] = useState<Pagina<HerramientaResumen> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Herramienta | null>(null); const [creating, setCreating] = useState(false); const [mode, setMode] = useState<Mode>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const request = useRef(0); const detailRequest = useRef(0); const lock = useRef(false); const intent = useRef<{ signature: string; key: string } | null>(null)
  const load = useCallback(async (nextPage = page) => { const token = ++request.current; setLoading(true); setError(''); try { const data = await listarHerramientas(q.trim().slice(0, 100), nextPage, LIMIT); if (token === request.current) { setResult(data); setPage(data.pagina) } } catch (cause) { if (token === request.current) setError(errorText(cause)) } finally { if (token === request.current) setLoading(false) } }, [page, q])
  useEffect(() => { let live = true; queueMicrotask(() => { if (live) void load() }); return () => { live = false; request.current += 1 } }, [load])
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
  const open = useCallback(async (id: number, requestedMode: Mode = null) => { if (lock.current) return; const token = ++detailRequest.current; setLoading(true); setError(''); try { const value = await obtenerHerramienta(id); if (token === detailRequest.current) { setDetail(value); setCreating(false); setMode(requestedMode === 'loan' && value.estado === 'DISPONIBLE' ? 'loan' : requestedMode === 'return' && value.prestamos.some(item => item.devueltaEn === null) ? 'return' : null); setNotice('') } } catch (cause) { if (token === detailRequest.current) setError(errorText(cause)) } finally { if (token === detailRequest.current) setLoading(false) } }, [])
  useEffect(() => { let live = true; const raw = new URLSearchParams(window.location.search).get('herramientaId'); if (raw && /^[1-9]\d*$/.test(raw)) { const id = Number(raw); if (Number.isSafeInteger(id) && id <= 2_147_483_647) queueMicrotask(() => { if (live) void open(id) }) }; return () => { live = false } }, [open])
  const keyFor = (operation: string, id: number | null, payload: unknown) => { const signature = JSON.stringify([operation, id, payload]); if (intent.current?.signature !== signature) intent.current = { signature, key: crypto.randomUUID() }; return intent.current.key }
  const mutate = async <T,>(operation: string, id: number | null, payload: T, run: (key: string) => Promise<Herramienta>) => { if (lock.current || busy) return false; detailRequest.current += 1; const key = keyFor(operation, id, payload); lock.current = true; setBusy(true); setError(''); try { const updated = await run(key); intent.current = null; setDetail(updated); setNotice(operation === 'herramienta:crear' ? 'Herramienta registrada.' : operation === 'herramienta:prestar' ? 'Préstamo registrado; la herramienta está prestada.' : 'Devolución registrada; la herramienta está disponible.'); setCreating(false); setMode(null); await load(1); return true } catch (cause) { setError(errorText(cause)); return false } finally { lock.current = false; setBusy(false) } }
  const save = (payload: HerramientaNueva) => mutate('herramienta:crear', null, payload, key => crearHerramienta(payload, key))
  const loan = (payload: PrestamoNuevo) => detail ? mutate('herramienta:prestar', detail.id, payload, key => prestarHerramienta(detail.id, payload, key)) : Promise.resolve(false)
  const giveBack = (prestamoId: number, payload: DevolucionNueva) => mutate('herramienta:devolver', prestamoId, payload, key => devolverPrestamoHerramienta(prestamoId, payload, key))
  const beginCreate = () => { if (busy) return; detailRequest.current += 1; intent.current = null; setDetail(null); setMode(null); setCreating(true); setError(''); setNotice('') }
  const columns: DataTableColumn<HerramientaResumen>[] = [
    { key: 'codigo', header: 'Código', render: row => <button type="button" className="logistica__link" disabled={busy} onClick={() => void open(row.id)}>{row.codigo}</button> },
    { key: 'nombre', header: 'Herramienta', render: row => row.nombre },
    { key: 'estado', header: 'Estado', render: row => <SemanticBadge label={row.estado === 'DISPONIBLE' ? 'Disponible' : 'Prestada'} variant={row.estado === 'DISPONIBLE' ? 'success' : 'warning'} icon={row.estado === 'DISPONIBLE' ? '✓' : '↗'} /> },
    { key: 'creada', header: 'Registrada', render: row => fechaVisible(row.creadaEn) },
    { key: 'acciones', header: 'Acciones', render: row => <ActionMenu label={`Acciones de herramienta ${row.codigo}`}><button type="button" disabled={busy} onClick={() => void open(row.id)}>Ver detalle</button>{row.estado === 'DISPONIBLE' ? <button type="button" disabled={busy} onClick={() => void open(row.id, 'loan')}>Prestar herramienta</button> : <button type="button" disabled={busy} onClick={() => void open(row.id, 'return')}>Registrar devolución</button>}</ActionMenu> },
  ]
  const header = <ModuleHeader breadcrumb="Fuentes gerenciales / Logística" title={detail ? `${detail.codigo} · ${detail.nombre}` : creating ? 'Nueva herramienta' : 'Herramientas'} description="Préstamos y devoluciones de herramientas de trabajo." action={!creating && !detail ? <Button variant="primary" disabled={busy} onClick={beginCreate}>Nueva herramienta</Button> : undefined} />
  return <section className="fuentes-scope logistica logistica-herramientas" aria-label="Herramientas gerenciales">{header}{notice && <p role="status" className="logistica__notice">{notice}</p>}{error && <p role="alert" className="logistica__error">{error}</p>}
    {creating && <HerramientaForm busy={busy} onSave={save} onCancel={() => { if (!busy) { intent.current = null; setCreating(false) } }} />}
    {!creating && detail && <HerramientaDetalle herramienta={detail} mode={mode} setMode={value => { if (!busy) { detailRequest.current += 1; intent.current = null; setMode(value) } }} busy={busy} onBack={() => { if (!busy) { detailRequest.current += 1; setDetail(null); setMode(null); setError('') } }} onLoan={loan} onReturn={giveBack} />}
    {!creating && !detail && <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, label: 'Buscar herramientas', placeholder: 'Código o nombre', onChange: value => { setQ(value.slice(0, 100)); setPage(1) } }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMIT, hayMas: result?.hayMas ?? false, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay herramientas registradas" emptyDescription="Registra una herramienta para controlar sus préstamos y devoluciones." />}
  </section>
}
