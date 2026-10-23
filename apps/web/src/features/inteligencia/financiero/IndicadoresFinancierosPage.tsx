import { AsistenteIndicadores } from '../asistente'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'
import { DataTable, MetricSummary, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { consultarTableroFinanciero } from './financiero.api'
import type { DesgloseFinanciero, MetricaFinanciera, TableroFinanciero } from './financiero.types'
import './financiero.css'

const money = (value: string | null | undefined) => value == null ? '—' : `C$ ${value}`
const fmtDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value)) : '—'
const fmtDateTime = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-NI', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Managua' }).format(new Date(value)) : '—'
const metricDefs = [
  ['facturacion', 'Facturación'], ['cobros', 'Cobros'], ['cuentas_por_cobrar', 'Cuentas por cobrar'],
  ['cuentas_vencidas', 'Cuentas vencidas'], ['costos', 'Costos'], ['resultado_registrado', 'Resultado registrado'], ['margen_porcentaje', 'Margen'],
] as const
const sourceNames: Record<string, string> = { comprobantes_gerenciales: 'Comprobantes', cobros_gerenciales: 'Cobros', aplicaciones_cobros_gerenciales: 'Aplicaciones de cobro', costos_gerenciales: 'Costos', facturables_gerenciales: 'Servicios realizados' }
const errText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo consultar el tablero financiero.'
const stamp = (date: Date) => `${new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)}:00-06:00`
function initialRange() { const now = new Date(); const from = new Date(now); from.setDate(from.getDate() - 30); return { desde: stamp(from), hasta: stamp(now) } }
const localIso = (value: string) => new Date(`${value.length === 16 ? `${value}:00` : value}-06:00`).toISOString()
function amount(metric: MetricaFinanciera | undefined) {
  if (!metric) return 'No disponible'
  if (metric.estado === 'SIN_BASE_DE_CALCULO' || metric.valor === null) return 'Sin base'
  if (metric.unidad === 'NIO') return money(String(metric.valor))
  if (metric.unidad === 'porcentaje') return `${metric.valor}%`
  return String(metric.valor)
}
function explanation(metric: MetricaFinanciera | undefined) {
  if (!metric) return 'Métrica ausente en la respuesta del servidor.'
  if (metric.clave === 'margen_porcentaje') {
    if (metric.estado === 'SIN_BASE_DE_CALCULO' || metric.valor === null) return metric.motivo ?? 'Sin facturación neta positiva para calcular el margen.'
    return metric.base ? `Base: resultado ${money(metric.base.numerador)} ÷ facturación ${money(metric.base.denominador)}.` : metric.motivo ?? 'Margen sobre facturación neta.'
  }
  return metric.motivo ?? (metric.clave === 'cuentas_por_cobrar' || metric.clave === 'cuentas_vencidas' ? 'Saldo evaluado al corte.' : 'Flujo neto del período.')
}
function readableSource(source: string) { return sourceNames[source] ?? 'Registro financiero' }
function eventLabel(event: string | null, cutoff: string | undefined, verb: 'Anulado' | 'Revertido') {
  if (!event) return null
  const afterCut = Boolean(cutoff && new Date(event) >= new Date(cutoff))
  return <><br /><SemanticBadge label={`${verb} ${afterCut ? 'después del corte' : 'antes del corte'}`} variant={afterCut ? 'warning' : 'neutral'} /> <small>{fmtDateTime(event)}</small></>
}
function sourceHref(row: DesgloseFinanciero) {
  if (row.tipo === 'COMPROBANTE') return `/inteligencia/origen/finanzas?comprobanteId=${row.id}`
  if (row.tipo === 'COBRO') return `/inteligencia/origen/finanzas?cobroId=${row.id}`
  if (row.tipo === 'COSTO') return `/inteligencia/origen/finanzas?costoId=${row.id}`
  if (row.tipo === 'FACTURABLE') return `/inteligencia/origen/finanzas?facturableId=${row.id}`
  return undefined
}
function rowSearch(row: DesgloseFinanciero) { return Object.values(row).filter(value => value != null).join(' ').toLocaleLowerCase() }

export function IndicadoresFinancierosPage() {
  const reqId = useRef(0)
  const [range, setRange] = useState(initialRange)
  const [from, setFrom] = useState(range.desde.slice(0, 19))
  const [until, setUntil] = useState(range.hasta.slice(0, 19))
  const [board, setBoard] = useState<TableroFinanciero | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<'TODOS' | DesgloseFinanciero['tipo']>('TODOS')
  const [group, setGroup] = useState<'TODOS' | 'CLIENTE' | 'ORDEN'>('TODOS')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const load = useCallback(async (desde: string, hasta: string) => {
    const id = ++reqId.current
    setLoading(true); setError('')
    try { const result = await consultarTableroFinanciero(desde, hasta); if (id === reqId.current) setBoard(result) }
    catch (cause) { if (id === reqId.current) setError(errText(cause)) }
    finally { if (id === reqId.current) setLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(range.desde, range.hasta) }); return () => { active = false; reqId.current += 1 } }, [load, range])
  const rows = useMemo(() => (board?.desgloses ?? []).filter(row => (kind === 'TODOS' || row.tipo === kind) && (row.tipo !== 'RENTABILIDAD' || group === 'TODOS' || row.agrupacion === group) && rowSearch(row).includes(query.toLocaleLowerCase())), [board, kind, group, query])
  const pageSize = 25
  const shown = rows.slice((page - 1) * pageSize, page * pageSize)
  const metrics = metricDefs.map(([key, label]) => ({ key, label, metric: board?.metricas.find(item => item.clave === key) }))
  const missing = board ? metrics.filter(item => !item.metric).map(item => item.label) : []
  const summary = metrics.slice(0, 4).map(({ label, metric }) => ({ label, value: amount(metric), description: explanation(metric) }))
  const cols: DataTableColumn<DesgloseFinanciero>[] = [
    { key: 'tipo', header: 'Tipo', render: row => row.tipo === 'FACTURABLE' ? 'Servicio pendiente' : row.tipo === 'RENTABILIDAD' ? `Rentabilidad · ${row.agrupacion === 'CLIENTE' ? 'cliente' : 'orden'}` : row.tipo === 'COMPROBANTE' ? 'Comprobante' : row.tipo === 'COBRO' ? 'Cobro' : 'Costo' },
    { key: 'referencia', header: 'Referencia', render: row => sourceHref(row) ? <a className="h6-link" href={sourceHref(row)}>{row.referencia || `#${row.id}`}</a> : row.referencia || `#${row.id}` },
    { key: 'cliente', header: 'Cliente / agrupación', render: row => row.tipo === 'RENTABILIDAD' ? row.agrupacion === 'CLIENTE' ? row.referencia : `Orden ${row.referencia}` : 'clienteNombre' in row ? row.clienteNombre : '—' },
    { key: 'fecha', header: 'Fecha', render: row => 'fecha' in row ? fmtDate(row.fecha) : '—' },
    { key: 'detalle', header: 'Detalle', render: row => row.tipo === 'COMPROBANTE' ? <>{money(row.importe)} · saldo al corte {money(row.saldo)}{eventLabel(row.anuladaEn, board?.corteEvaluacion, 'Anulado')}</> : row.tipo === 'COBRO' ? <>{money(row.importe)}{eventLabel(row.revertidoEn, board?.corteEvaluacion, 'Revertido')}</> : row.tipo === 'COSTO' ? <>{row.categoria} · {money(row.importe)}{eventLabel(row.revertidoEn, board?.corteEvaluacion, 'Revertido')}</> : row.tipo === 'FACTURABLE' ? `${row.conceptoNombre}: ${row.pendiente} ${row.unidad} pendientes` : `Ingresos ${money(row.ingresos)} · costos ${money(row.costos)} · resultado ${money(row.resultado)} · margen ${row.margen == null ? 'sin base' : `${row.margen}%`}` },
    { key: 'neto', header: 'Neto período', render: row => row.tipo === 'COMPROBANTE' || row.tipo === 'COBRO' || row.tipo === 'COSTO' ? money(row.netoPeriodo) : row.tipo === 'FACTURABLE' ? `${row.cantidad} ${row.unidad}` : money(row.resultado) },
  ]
  const fromDate = from ? new Date(`${from.length === 16 ? `${from}:00` : from}-06:00`) : null
  const untilDate = until ? new Date(`${until.length === 16 ? `${until}:00` : until}-06:00`) : null
  const valid = Boolean(fromDate && untilDate && fromDate < untilDate && untilDate.getTime() - fromDate.getTime() <= 366 * 86400000)
  const apply = () => { if (valid) { setRange({ desde: localIso(from), hasta: localIso(until) }); setPage(1) } }
  const coverage = board?.cobertura.estado
  return <section className="h6-dashboard" aria-labelledby="financial-dashboard-title">
    <ModuleHeader breadcrumb="Inteligencia" title="Indicadores financieros" description="Facturación, cobros, saldos, costos y servicios pendientes capturados en TrackOn." action={<nav className="h6-source-links" aria-label="Fuentes financieras"><a href="/inteligencia/origen/finanzas">Comprobantes y cobros</a></nav>} />
    <form className="h6-range" onSubmit={event => { event.preventDefault(); apply() }}><label>Desde<input type="datetime-local" step="1" value={from} onChange={event => setFrom(event.currentTarget.value)} /></label><label>Hasta<input type="datetime-local" step="1" value={until} onChange={event => setUntil(event.currentTarget.value)} /></label><Button type="submit" variant="primary" disabled={!valid || loading}>Consultar</Button></form>
    {board && !loading && !error && <AsistenteIndicadores key={`${board.desde}|${board.hasta}|${board.corteEvaluacion}`} area="financiero" desde={board.desde} hasta={board.hasta} />}
    {error && <p className="h6-error" role="alert">{error} <Button onClick={() => void load(range.desde, range.hasta)}>Reintentar</Button></p>}
    {coverage && <p className="h6-coverage" role="note"><SemanticBadge label={coverage === 'COMPLETA' ? 'Cobertura verificada para el rango' : coverage === 'PARCIAL' ? 'Cobertura parcial' : 'Sin registros financieros'} variant={coverage === 'COMPLETA' ? 'success' : coverage === 'PARCIAL' ? 'warning' : 'neutral'} /> Los indicadores reflejan únicamente los registros capturados; la cobertura parcial no representa el total empresarial. {board?.cobertura.observaciones.join(' ')} Corte evaluado: {fmtDateTime(board?.corteEvaluacion ?? null)}. Cobertura desde {fmtDateTime(board?.cobertura.desde)} hasta {fmtDateTime(board?.cobertura.hastaVerificada)}.</p>}
    {board && new Date(board.hasta) > new Date(board.corteEvaluacion) && <p className="h6-note">El rango termina en el futuro; los saldos y eventos se evalúan hasta el corte indicado.</p>}
    {missing.length > 0 && <p className="h6-error" role="alert">Respuesta incompleta del servidor: faltan {missing.join(', ')}.</p>}
    {board ? <MetricSummary metrics={summary} label="Indicadores destacados" /> : loading ? <p role="status">Cargando indicadores financieros…</p> : null}
    {board && <section className="h6-metric-table" aria-labelledby="h6-metrics-title"><h2 id="h6-metrics-title">Indicadores financieros</h2><div className="h6-table-scroll" role="region" aria-label="Las siete métricas financieras" tabIndex={0}><table><thead><tr><th>Métrica</th><th>Valor</th><th>Lectura y base</th><th>Fuentes</th></tr></thead><tbody>{metrics.map(({ key, label, metric }) => <tr key={key}><th scope="row">{label}</th><td>{amount(metric)}</td><td>{explanation(metric)}</td><td>{metric?.fuentes.map(readableSource).join(', ') || '—'}</td></tr>)}</tbody></table></div><p>Resultado registrado = facturación neta − costos registrados. No se estiman costos sin vínculo explícito.</p></section>}
    <section className="h6-breakdowns" aria-labelledby="h6-breakdowns-title"><div className="h6-section-heading"><div><h2 id="h6-breakdowns-title">Desgloses y trazabilidad</h2><p>La rentabilidad por cliente y por orden son vistas separadas; sus resultados no se suman entre sí.</p></div><label>Tipo<select value={kind} onChange={event => { setKind(event.currentTarget.value as typeof kind); setPage(1) }}><option value="TODOS">Todos</option><option value="COMPROBANTE">Comprobantes</option><option value="COBRO">Cobros</option><option value="COSTO">Costos</option><option value="FACTURABLE">Servicios pendientes</option><option value="RENTABILIDAD">Rentabilidad</option></select></label>{kind === 'RENTABILIDAD' && <label>Agrupar por<select value={group} onChange={event => { setGroup(event.currentTarget.value as typeof group); setPage(1) }}><option value="TODOS">Cliente y orden (separados)</option><option value="CLIENTE">Cliente</option><option value="ORDEN">Orden</option></select></label>}</div>
      <DataTable columns={cols} rows={shown} getRowKey={row => `${row.tipo}-${row.tipo === 'RENTABILIDAD' ? row.agrupacion : ''}-${row.id}`} search={{ value: query, onChange: value => { setQuery(value.slice(0, 100)); setPage(1) }, placeholder: 'Referencia, cliente o concepto', label: 'Buscar desgloses' }} pagination={{ pagina: page, limite: pageSize, hayMas: rows.length > page * pageSize, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load(range.desde, range.hasta)} emptyTitle="No hay registros para este período" emptyDescription="Amplía el rango o consulta otra fuente." />
      {board && <p>{board.registrosSinAsignar} costos sin asignación a cliente, orden o comprobante. Los servicios pendientes conservan su unidad y se muestran por concepto y cliente; no se suman unidades distintas.</p>}
    </section>
  </section>
}
