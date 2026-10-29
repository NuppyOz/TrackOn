import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../../shared/ui'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../../erp-ui/components'
import { crearArticulo, listarArticulos, obtenerArticulo } from './articulos.api'
import { ArticuloForm } from './ArticuloForm'
import { fechaVisible } from './fechas'
import type { Articulo, ArticuloNuevo, Pagina } from './articulos.types'
import { listarMovimientos } from '../movimientos/movimientos.api'
import type { Movimiento } from '../movimientos/movimientos.types'
import './logistica.css'

const LIMITE = 25
const intentKey = () => globalThis.crypto.randomUUID()
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const groupDecimal = (value: string) => {
  const [integer, fraction] = value.split('.')
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`
}
const tipoLabel = (movement: Movimiento) => movement.sentido === 1 ? 'Entrada' : 'Salida'
const tipoNombre: Record<Movimiento['tipo'], string> = { APERTURA: 'Apertura', ENTRADA: 'Entrada', CONSUMO: 'Consumo', DEVOLUCION: 'Devolución', AJUSTE_POSITIVO: 'Ajuste positivo', AJUSTE_NEGATIVO: 'Ajuste negativo', REVERSO: 'Reverso' }

type Props = Readonly<{ onBusyChange?: (busy: boolean) => void }>
export function ArticulosPage({ onBusyChange }: Props = {}) {
  const [result, setResult] = useState<Pagina<Articulo> | null>(null); const [q, setQ] = useState(''); const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Articulo | null>(null); const [form, setForm] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [movements, setMovements] = useState<Pagina<Movimiento> | null>(null); const [movementPage, setMovementPage] = useState(1); const [historyRetry, setHistoryRetry] = useState(0)
  const request = useRef(0); const detailRequest = useRef(0); const intent = useRef<{ signature: string; key: string } | null>(null); const lock = useRef(false)
  const load = useCallback(async (nextPage = page) => {
    const id = ++request.current; setLoading(true); setError('')
    try { const data = await listarArticulos({ q: q.trim().slice(0, 100) || undefined, pagina: nextPage, limite: LIMITE }); if (id === request.current) { setResult(data); setPage(data.pagina) } }
    catch (cause) { if (id === request.current) setError(errorMessage(cause)) }
    finally { if (id === request.current) setLoading(false) }
  }, [page, q])
  useEffect(() => { let live = true; queueMicrotask(() => { if (live) void load() }); return () => { live = false; request.current += 1 } }, [load])
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false) }, [busy, onBusyChange])
  const open = useCallback(async (id: number) => {
    if (lock.current) return
    const requestId = ++detailRequest.current
    setError(''); setLoading(true)
    try { const value = await obtenerArticulo(id); if (requestId === detailRequest.current) { setDetail(value); setForm(false); setMovementPage(1); setNotice('') } }
    catch (cause) { if (requestId === detailRequest.current) setError(errorMessage(cause)) }
    finally { if (requestId === detailRequest.current) setLoading(false) }
  }, [])
  useEffect(() => {
    let live = true
    const raw = new URLSearchParams(window.location.search).get('articuloId')
    if (raw && /^[1-9]\d*$/.test(raw)) {
      const id = Number(raw)
      if (Number.isSafeInteger(id) && id <= 2_147_483_647) queueMicrotask(() => { if (live) void open(id) })
    }
    return () => { live = false }
  }, [open])
  const detailId = detail?.id
  useEffect(() => {
    if (detailId === undefined || form) return
    let live = true
    listarMovimientos({ articuloId: detailId, pagina: movementPage, limite: LIMITE }).then(data => { if (live) setMovements(data) }).catch(cause => { if (live) setError(errorMessage(cause)) })
    return () => { live = false }
  }, [detailId, form, movementPage, historyRetry])
  const save = async (payload: ArticuloNuevo): Promise<boolean> => {
    if (lock.current || busy) return false
    const signature = JSON.stringify(['articulo:crear', payload])
    if (intent.current?.signature !== signature) intent.current = { signature, key: intentKey() }
    lock.current = true; setBusy(true); setError('')
    try {
      const created = await crearArticulo(payload, intent.current.key)
      intent.current = null; setDetail(created); setForm(false); setNotice('Artículo creado con su saldo de apertura.'); await load(1); return true
    } catch (cause) { setError(errorMessage(cause)); return false }
    finally { lock.current = false; setBusy(false) }
  }
  const beginCreate = () => { intent.current = null; setDetail(null); setForm(true); setNotice(''); setError('') }
  const columns: DataTableColumn<Articulo>[] = [
    { key: 'codigo', header: 'Código', render: item => <button type="button" className="logistica__link" onClick={() => void open(item.id)}>{item.codigo}</button> },
    { key: 'nombre', header: 'Artículo', render: item => item.nombre },
    { key: 'saldoCantidad', header: 'Saldo', render: item => `${item.saldoCantidad} ${item.unidad}`, align: 'end' },
    { key: 'minimo', header: 'Mínimo', render: item => `${item.minimo} ${item.unidad}`, align: 'end' },
    { key: 'saldoValor', header: 'Valor de saldo (NIO)', render: item => groupDecimal(item.saldoValor), align: 'end' },
    { key: 'acciones', header: 'Acciones', render: item => <ActionMenu label={`Acciones de ${item.codigo}`}><button type="button" disabled={busy} onClick={() => void open(item.id)}>Ver artículo</button></ActionMenu> },
  ]
  const header = <ModuleHeader breadcrumb="Fuentes gerenciales / Logística" title={detail ? detail.codigo : form ? 'Nuevo artículo' : 'Artículos'} description="Registros gerenciales de artículos y saldos, separados del inventario operativo." action={!form && !detail ? <Button variant="primary" disabled={busy} onClick={beginCreate}>Nuevo artículo</Button> : undefined} />
  return <section className="fuentes-scope logistica" aria-label="Artículos">
    {header}{notice && <p role="status" className="logistica__notice">{notice}</p>}{error && <p role="alert" className="logistica__error">{error}</p>}
    {form && <ArticuloForm busy={busy} onSave={save} onCancel={() => { intent.current = null; setForm(false) }} />}
    {!form && detail && <section className="logistica__panel"><div className="logistica__detail-head"><div><h2>{detail.codigo} · {detail.nombre}</h2><p>{detail.unidad}</p></div><Button disabled={busy} onClick={() => { setDetail(null); setMovements(null) }}>Volver a artículos</Button></div>
      <dl className="logistica__facts"><div><dt>Saldo actual</dt><dd>{detail.saldoCantidad} {detail.unidad}</dd></div><div><dt>Stock mínimo</dt><dd>{detail.minimo} {detail.unidad}</dd></div><div><dt>Valor actual (NIO)</dt><dd>{groupDecimal(detail.saldoValor)}</dd></div><div><dt>Costo promedio informativo</dt><dd>{detail.costoPromedio === null ? 'Sin saldo' : groupDecimal(detail.costoPromedio)}</dd></div><div><dt>Último movimiento</dt><dd>{fechaVisible(detail.ultimaFecha)}</dd></div></dl>
      <h3>Historial de movimientos</h3><DataTable columns={movementColumns} rows={movements?.items ?? []} getRowKey={row => row.id} pagination={{ pagina: movements?.pagina ?? movementPage, limite: movements?.limite ?? LIMITE, hayMas: movements?.hayMas ?? false, onPageChange: setMovementPage }} state={error ? 'error' : movements ? 'ready' : 'loading'} error={{ title: error }} onRetry={() => { if (movementPage !== 1) setMovementPage(1); else setHistoryRetry(value => value + 1) }} emptyTitle="Sin movimientos registrados" emptyDescription="El historial aparecerá aquí cuando existan entradas o salidas." />
    </section>}
    {!form && !detail && <DataTable columns={columns} rows={result?.items ?? []} getRowKey={item => item.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, label: 'Buscar artículos', placeholder: 'Código o nombre' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMITE, hayMas: result?.hayMas ?? false, onPageChange: value => { setPage(value); void load(value) } }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay artículos registrados" emptyDescription="Crea un artículo y registra su saldo de apertura." />}
  </section>
}

const movementColumns: DataTableColumn<Movimiento>[] = [
  { key: 'fecha', header: 'Fecha efectiva', render: row => fechaVisible(row.fechaEfectiva) },
  { key: 'referencia', header: 'Referencia', render: row => row.referencia },
  { key: 'tipo', header: 'Movimiento', render: row => <SemanticBadge label={`${tipoLabel(row)} · ${tipoNombre[row.tipo]}`} icon={row.sentido === 1 ? '+' : '−'} variant={row.sentido === 1 ? 'success' : 'warning'} /> },
  { key: 'cantidad', header: 'Cantidad', render: row => `${row.sentido < 0 ? '−' : '+'}${row.cantidad} ${row.unidad}`, align: 'end' },
  { key: 'valor', header: 'Valor (NIO)', render: row => `${row.sentido < 0 ? '−' : '+'}${groupDecimal(row.valor)}`, align: 'end' },
  { key: 'saldo', header: 'Saldo posterior', render: row => `${row.saldoCantidad} ${row.unidad}`, align: 'end' },
]
