import { AsistenteIndicadores } from '../asistente'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'
import { DataTable, MetricSummary, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { consultarTableroComercial } from './comercial.api'
import type { DesgloseComercial, MetricaComercial, TableroComercial } from './comercial.types'
import './comercial.css'

const stamp = (d: Date) => {
  const shifted = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return `${shifted.toISOString().slice(0, 16)}:00-06:00`
}
const formatDate = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
const formatDateTime = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(new Date(value))
const sourceNames: Record<string, string> = { cotizaciones_comerciales: 'Cotizaciones', ventas_comerciales: 'Ventas', contratos_gerenciales: 'Contratos' }
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo consultar el tablero.'
const DEFAULT_METRICS = [
  ['cotizaciones_total', 'Cotizaciones'], ['conversion_porcentaje', 'Conversión'], ['ventas_cantidad', 'Ventas'],
  ['ventas_importe', 'Importe de ventas'], ['clientes_con_ventas', 'Clientes con ventas'], ['ticket_promedio', 'Ticket promedio'],
  ['contratos_activos', 'Contratos activos'], ['renovaciones_cantidad', 'Renovaciones'], ['renovacion_porcentaje', 'Tasa de renovación'],
] as const
function metricValue(metric: MetricaComercial | undefined) {
  if (!metric) return 'No disponible'
  if (metric.estado === 'SIN_BASE_DE_CALCULO' || metric.valor === null) return 'Sin base'
  if (metric.unidad === 'NIO') return `C$ ${metric.valor}`
  if (metric.unidad === 'porcentaje') return `${metric.valor}%`
  return String(metric.valor)
}
function denominator(metric: MetricaComercial | undefined) {
  if (!metric) return 'Métrica ausente en la respuesta del servidor.'
  if (metric.unidad !== 'porcentaje') return undefined
  if (metric.estado === 'SIN_BASE_DE_CALCULO') return metric.motivo ?? 'No hay registros para calcular esta tasa.'
  return metric.base ? `${metric.base.numerador} de ${metric.base.denominador}` : metric.motivo ?? undefined
}
function initialRange() {
  const now = new Date()
  const from = new Date(now); from.setDate(from.getDate() - 30)
  return { desde: stamp(from), hasta: stamp(now) }
}
export function IndicadoresComercialesPage() {
  const boardRequest = useRef(0)
  const [range, setRange] = useState(initialRange)
  const [draftFrom, setDraftFrom] = useState(range.desde.slice(0, 16))
  const [draftUntil, setDraftUntil] = useState(range.hasta.slice(0, 16))
  const [board, setBoard] = useState<TableroComercial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<'TODOS' | DesgloseComercial['tipo']>('TODOS')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const load = useCallback(async (from: string, until: string) => { const request = ++boardRequest.current; setLoading(true); setError(''); try { const value = await consultarTableroComercial(from, until); if (request === boardRequest.current) setBoard(value) } catch (cause) { if (request === boardRequest.current) setError(message(cause)) } finally { if (request === boardRequest.current) setLoading(false) } }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(range.desde, range.hasta) }); return () => { active = false; boardRequest.current += 1 } }, [load, range])
  const filtered = useMemo(() => (board?.desgloses ?? []).filter(row => (kind === 'TODOS' || row.tipo === kind) && `${row.referencia} ${row.clienteId} ${row.id} ${row.estado ?? ''}`.toLocaleLowerCase().includes(q.toLocaleLowerCase())), [board, kind, q])
  const PAGE = 25
  const pageItems = filtered.slice((page - 1) * PAGE, page * PAGE)
  const metrics = DEFAULT_METRICS.map(([key, label]) => ({ metric: board?.metricas.find(metric => metric.clave === key), key, label }))
  const missingMetrics = board ? metrics.filter(item => !item.metric).map(item => item.label) : []
  const quoteStates = new Map<string, number>()
  for (const row of board?.desgloses ?? []) if (row.tipo === 'COTIZACION') { const state = row.estado ?? 'Sin estado'; quoteStates.set(state, (quoteStates.get(state) ?? 0) + 1) }
  const summary = metrics.slice(0, 4).map(({ metric, label }) => ({ label, value: metricValue(metric), description: denominator(metric) }))
  const cols: DataTableColumn<DesgloseComercial>[] = [
    { key: 'tipo', header: 'Fuente', render: row => row.tipo === 'COTIZACION' ? 'Cotización' : row.tipo === 'VENTA' ? 'Venta' : 'Contrato' },
    { key: 'referencia', header: 'Referencia', render: row => <a className="h5-link" href={row.tipo === 'CONTRATO' ? `/inteligencia/origen/contratos?contratoId=${row.id}` : `/comercial/cotizaciones-ventas?${row.tipo === 'VENTA' ? 'ventaId' : 'cotizacionId'}=${row.id}`}>{row.referencia || `#${row.id}`}</a> },
    { key: 'clienteId', header: 'Cliente', render: row => `Cliente #${row.clienteId}` },
    { key: 'fecha', header: 'Fecha', render: row => formatDate(row.fecha) },
    { key: 'estado', header: 'Estado', render: row => row.estado ? <SemanticBadge label={row.estado} variant={row.estado === 'APROBADA' || row.estado === 'ACTIVA' ? 'success' : 'neutral'} /> : '—' },
    { key: 'total', header: 'Importe', render: row => row.total ? `C$ ${row.total}` : '—' },
  ]
  const fromDate = draftFrom ? new Date(`${draftFrom}:00-06:00`) : null
  const untilDate = draftUntil ? new Date(`${draftUntil}:00-06:00`) : null
  const validRange = Boolean(fromDate && untilDate && fromDate < untilDate && untilDate.getTime() - fromDate.getTime() <= 366 * 24 * 60 * 60 * 1000)
  const apply = () => { if (validRange) { const toIso = (value: string) => new Date(`${value}:00-06:00`).toISOString(); setRange({ desde: toIso(draftFrom), hasta: toIso(draftUntil) }); setPage(1) } }
  const status = board?.cobertura.estado
  return <section className="h5-dashboard" aria-labelledby="commercial-dashboard-title">
    <ModuleHeader breadcrumb="Inteligencia" title="Indicadores comerciales" description="Cotizaciones, ventas, clientes, contratos y renovaciones registradas en TrackOn." action={<nav className="h5-source-links" aria-label="Registros de origen comerciales"><a href="/comercial/cotizaciones-ventas">Cotizaciones y ventas</a><a href="/inteligencia/origen/contratos">Contratos</a></nav>} />
    <form className="h5-range" onSubmit={event => { event.preventDefault(); apply() }}><label>Desde<input type="datetime-local" value={draftFrom} onChange={event => setDraftFrom(event.currentTarget.value)} /></label><label>Hasta<input type="datetime-local" value={draftUntil} onChange={event => setDraftUntil(event.currentTarget.value)} /></label><Button variant="primary" type="submit" disabled={!validRange || loading}>Consultar</Button></form>
    {board && !loading && !error && <AsistenteIndicadores key={`${board.desde}|${board.hasta}|${board.corteEvaluacion}`} area="comercial" desde={board.desde} hasta={board.hasta} />}
    {error && <p className="h5-error" role="alert">{error} <Button onClick={() => void load(range.desde, range.hasta)}>Reintentar</Button></p>}
    {status && <p className="h5-coverage" role="note"><SemanticBadge label={status === 'COMPLETA' ? 'Cobertura verificada para el rango' : status === 'PARCIAL' ? 'Cobertura parcial' : 'Sin registros de cobertura'} variant={status === 'COMPLETA' ? 'success' : status === 'PARCIAL' ? 'warning' : 'neutral'} /> El tablero refleja únicamente las fuentes registradas; no representa actividad empresarial fuera del alcance capturado. {board?.cobertura.observaciones.join(' ')} Corte evaluado: {board?.corteEvaluacion ? formatDateTime(board.corteEvaluacion) : '—'}.</p>}
    {missingMetrics.length > 0 && <p className="h5-error" role="alert">Respuesta incompleta del servidor: faltan {missingMetrics.join(', ')}.</p>}
    <MetricSummary metrics={summary} label="Indicadores destacados" />
    <section className="h5-metric-table" aria-labelledby="all-metrics-title"><h2 id="all-metrics-title">Indicadores H.5</h2><div className="h5-table-scroll" role="region" aria-label="Todas las métricas comerciales" tabIndex={0}><table><thead><tr><th>Métrica</th><th>Valor</th><th>Lectura</th><th>Fuentes</th></tr></thead><tbody>{metrics.map(({ metric, key, label }) => <tr key={key}><th scope="row">{label}</th><td>{metricValue(metric)}</td><td>{denominator(metric) ?? metric?.motivo ?? 'Según el período consultado'}</td><td>{metric?.fuentes.map(source => sourceNames[source] ?? source).join(', ') || '—'}</td></tr>)}</tbody></table></div></section>
    <section className="h5-breakdowns" aria-labelledby="commercial-breakdown-title">{quoteStates.size > 0 && <div className="h5-quote-states"><h3>Cotizaciones por estado actual</h3>{Array.from(quoteStates, ([state, count]) => <span key={state}><SemanticBadge label={state} variant={state === 'APROBADA' ? 'success' : 'neutral'} /> {count}</span>)}</div>}<div className="h5-section-heading"><div><h2 id="commercial-breakdown-title">Registros de origen</h2><p>Documentos y fichas vinculados a los indicadores del período.</p></div><label>Tipo<select value={kind} onChange={event => { setKind(event.currentTarget.value as typeof kind); setPage(1) }}><option value="TODOS">Todos</option><option value="COTIZACION">Cotizaciones</option><option value="VENTA">Ventas</option><option value="CONTRATO">Contratos</option></select></label></div>
      <DataTable columns={cols} rows={pageItems} getRowKey={row => `${row.tipo}-${row.id}`} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, placeholder: 'Referencia, estado o cliente', label: 'Buscar registros' }} pagination={{ pagina: page, limite: PAGE, hayMas: filtered.length > page * PAGE, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load(range.desde, range.hasta)} emptyTitle="No hay registros para este período" emptyDescription="Amplía el rango o consulta otra fuente." />
    </section>
  </section>
}
