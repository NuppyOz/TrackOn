import { useCallback, useEffect, useRef, useState } from 'react'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { ActionMenu, Button } from '../../../shared/ui'
import { DataTable, SemanticBadge, type DataTableColumn, type SortDirection } from '../../erp-ui/components'
import { listarVentas, obtenerVenta } from './ventas.api'
import type { VentaDetalle, VentaResumen } from './ventas.types'
import './ventas.css'

const LIMITE = 25
const money = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return `C$ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`
}
const quantity = (value: string) => {
  const [whole, fraction = ''] = value.split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(3, '0')}`
}
const date = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Fecha no válida' : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(parsed)
}
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'

export type VentasPageProps = Readonly<{ ventaInicialId?: number }>
export function VentasPage({ ventaInicialId }: VentasPageProps) {
  const [rows, setRows] = useState<VentaResumen[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [q, setQ] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [sortBy, setSortBy] = useState<'id' | 'confirmadaEn'>('confirmadaEn')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Cliente[]>([])
  const [detail, setDetail] = useState<VentaDetalle | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')
  const listRequest = useRef(0)
  const detailRequest = useRef(0)

  const open = useCallback(async (id: number) => {
    const request = ++detailRequest.current
    setDetailId(id)
    setLoadingDetail(true); setDetailError('')
    try {
      const venta = await obtenerVenta(id)
      if (request === detailRequest.current) setDetail(venta)
    } catch (cause) { if (request === detailRequest.current) setDetailError(message(cause)) }
    finally { if (request === detailRequest.current) setLoadingDetail(false) }
  }, [])

  const load = useCallback(async (requestedPage = page) => {
    const request = ++listRequest.current
    setLoading(true); setError('')
    try {
      const result = await listarVentas({ q: q.trim().slice(0, 100) || undefined, clienteId: clienteId ? Number(clienteId) : undefined, pagina: requestedPage, limite: LIMITE, sortBy, sortDir })
      if (request !== listRequest.current) return
      setRows(result.items); setPage(result.pagina); setHasMore(result.hayMas)
    } catch (cause) { if (request === listRequest.current) setError(message(cause)) }
    finally { if (request === listRequest.current) setLoading(false) }
  }, [page, q, clienteId, sortBy, sortDir])

  useEffect(() => {
    let live = true
    queueMicrotask(() => { if (live) void load() })
    return () => { live = false; listRequest.current += 1 }
  }, [load])
  useEffect(() => {
    let live = true
    listarClientes().then(value => { if (live) setClients(value) }).catch(cause => { if (live) setError(message(cause)) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    let live = true
    queueMicrotask(() => { if (live && ventaInicialId) void open(ventaInicialId) })
    return () => { live = false; detailRequest.current += 1 }
  }, [ventaInicialId, open])
  const close = () => { detailRequest.current += 1; setDetail(null); setDetailId(null); setDetailError('') }
  const changeSort = (key: string, direction: SortDirection) => {
    if (key !== 'id' && key !== 'confirmadaEn') return
    setSortBy(key); setSortDir(direction); setPage(1)
  }
  const columns: DataTableColumn<VentaResumen>[] = [
    { key: 'id', header: 'Venta', sortable: true, render: row => <button type="button" className="ventas__link" disabled={loadingDetail} onClick={() => void open(row.id)}>V-{row.id}</button> },
    { key: 'cotizacionId', header: 'Cotización', render: row => `C-${row.cotizacionId}` },
    { key: 'clienteNombreRegistrado', header: 'Cliente', render: row => row.clienteNombreRegistrado },
    { key: 'total', header: 'Total', align: 'end', render: row => <strong className="ventas__money">{money(row.total)}</strong> },
    { key: 'confirmadaEn', header: 'Fecha de venta', sortable: true, render: row => date(row.confirmadaEn) },
    { key: 'acciones', header: 'Acciones', align: 'end', render: row => <ActionMenu label={`Acciones V-${row.id}`}><button type="button" disabled={loadingDetail} onClick={() => void open(row.id)}>Ver detalle</button></ActionMenu> },
  ]

  return <section className="ventas" aria-labelledby="ventas-title">
    <header className="ventas__header"><div><p>Comercial / Cotizaciones y ventas</p><h2 id="ventas-title">Ventas registradas</h2><span>Ventas confirmadas a partir de cotizaciones aprobadas.</span></div></header>
    <p className="ventas__notice" role="note">Una venta conserva los precios aprobados. La facturación y los cobros se registran por separado.</p>
    {!detail && <div className="ventas__filters"><label>Cliente<select aria-label="Filtrar ventas por cliente" value={clienteId} onChange={event => { setClienteId(event.currentTarget.value); setPage(1) }}><option value="">Todos los clientes</option>{clients.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label></div>}
    {error && !detail && <p role="alert" className="ventas__error">{error}</p>}
    {detailError && !detail && !loadingDetail && <p role="alert" className="ventas__error">{detailError} {detailId && <Button onClick={() => void open(detailId)}>Reintentar</Button>}</p>}
    {detail ? <section className="ventas__detail" aria-labelledby="venta-detail-title">
      <div className="ventas__detail-head"><div><p className="ventas__eyebrow">REGISTRO DE VENTA</p><h3 id="venta-detail-title">V-{detail.id} · {detail.clienteNombreRegistrado}</h3></div><Button onClick={close}>Volver a ventas</Button></div>
      {detailError && <p role="alert" className="ventas__error">{detailError} <Button onClick={() => void open(detail.id)}>Reintentar</Button></p>}
      <dl className="ventas__facts"><div><dt>Cotización de origen</dt><dd>C-{detail.cotizacionId}</dd></div><div><dt>Cliente</dt><dd>{detail.clienteNombreRegistrado}</dd></div><div><dt>Confirmada</dt><dd>{date(detail.confirmadaEn)}</dd></div><div><dt>Confirmada por</dt><dd>{detail.confirmadaPor.nombre}</dd></div><div><dt>Moneda</dt><dd>{detail.moneda}</dd></div></dl>
      <div className="ventas__table-wrap" role="region" aria-label="Líneas de venta" tabIndex={0}><table><thead><tr><th>Descripción</th><th>Tipo</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Subtotal</th><th>Total</th></tr></thead><tbody>{detail.lineas.map(line => <tr key={line.id}><td>{line.descripcion}<small>{line.unidad}</small></td><td>{line.tipo}</td><td>{quantity(line.cantidad)}</td><td>{money(line.precio)}</td><td>{money(line.descuento)}</td><td>{money(line.subtotal)}</td><td>{money(line.total)}</td></tr>)}</tbody></table></div>
      <div className="ventas__total"><span>Total de venta</span><strong>{money(detail.total)} {detail.moneda}</strong></div>
      <SemanticBadge label="Venta registrada" variant="success" icon="✓" />
    </section> : loadingDetail ? <p role="status" className="ventas__loading">Cargando venta…</p> : <DataTable columns={columns} rows={rows} getRowKey={row => row.id}
      search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, placeholder: 'Cliente o venta', label: 'Buscar' }}
      sort={{ key: sortBy, direction: sortDir, onChange: changeSort }} pagination={{ pagina: page, limite: LIMITE, hayMas: hasMore, onPageChange: value => setPage(value) }}
      state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay ventas registradas" emptyDescription="Las ventas aparecen aquí cuando conviertes una cotización aprobada." />}
  </section>
}
