import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'
import { listarArticulos } from '../../fuentes-gerenciales/logistica/articulos/articulos.api'
import type { Articulo } from '../../fuentes-gerenciales/logistica/articulos/articulos.types'
import { DataTable, MetricSummary, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { fechaHora, isoManagua } from './fechas'
import { consultarTableroLogistico } from './logistico.api'
import type { DesgloseLogistico, TableroLogistico, TipoDesgloseLogistico } from './logistico.types'
import './logistico.css'

const LIMIT = 25
const metricDefs = [
  ['stock_critico_cantidad', 'Artículos con stock crítico'], ['compras_pendientes_cantidad', 'Líneas de compra pendientes'],
  ['herramientas_prestadas', 'Herramientas prestadas'], ['herramientas_vencidas', 'Préstamos vencidos'], ['inventario_valorizado', 'Inventario valorizado'],
] as const
const metricSources: Record<string, string> = { articulos_gerenciales: 'Artículos', movimientos_gerenciales: 'Movimientos logísticos', compras_gerenciales: 'Compras', lineas_compras_gerenciales: 'Líneas de compra', recepciones_gerenciales: 'Recepciones', prestamos_herramientas_gerenciales: 'Préstamos de herramientas' }
const typeLabel: Record<Exclude<TipoDesgloseLogistico, 'TODOS'>, string> = { ARTICULO: 'Artículo', COMPRA_LINEA: 'Línea de compra', RECEPCION: 'Recepción', HERRAMIENTA: 'Herramienta prestada' }
const typeIcon: Record<Exclude<TipoDesgloseLogistico, 'TODOS'>, string> = { ARTICULO: '▦', COMPRA_LINEA: '↗', RECEPCION: '↓', HERRAMIENTA: '⚒' }
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo consultar el tablero logístico.'
const timestamp = (date: Date) => new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19)
function initialRange() { const until = new Date(); const from = new Date(until); from.setDate(from.getDate() - 30); return { desde: `${timestamp(from)}-06:00`, hasta: `${timestamp(until)}-06:00` } }
function reasonText(reason: string | null) {
  if (!reason) return null
  if (reason === 'SIN_COBERTURA_ARTICULO') return 'El artículo aún no tenía historial al inicio del período; no se calcula su promedio ni rotación.'
  if (reason === 'CONSUMO_NETO_NEGATIVO') return 'Las devoluciones netas superan el consumo registrado en el período.'
  if (reason === 'SIN_BASE_DE_CALCULO') return 'No hay una base positiva de existencias durante el período para calcular la rotación.'
  return reason.replaceAll('_', ' ').toLocaleLowerCase('es-NI')
}
function metricValue(metric: TableroLogistico['metricas'][number] | undefined, key: string) {
  if (!metric || metric.valor === null) return 'No disponible'
  return key === 'inventario_valorizado' ? `C$ ${String(metric.valor)}` : String(metric.valor)
}
function rowValues(row: DesgloseLogistico) { return Object.values(row).filter(value => value !== null && value !== undefined).join(' ').toLocaleLowerCase('es-NI') }
function rowArticleId(row: DesgloseLogistico) { return row.tipo === 'ARTICULO' ? row.id : row.tipo === 'HERRAMIENTA' ? null : row.articuloId }
function sourceHref(row: DesgloseLogistico) {
  if (row.tipo === 'ARTICULO') return `/inteligencia/origen/logistica?articuloId=${row.id}`
  if (row.tipo === 'COMPRA_LINEA' || row.tipo === 'RECEPCION') return `/inteligencia/origen/logistica?compraId=${row.compraId}`
  return `/inteligencia/origen/logistica?herramientaId=${row.id}`
}
function mergeById<T extends { id: number }>(old: T[], next: T[]) { const map = new Map(old.map(row => [row.id, row])); next.forEach(row => map.set(row.id, row)); return [...map.values()] }
function currentMetricExplanation(key: string, metric: TableroLogistico['metricas'][number] | undefined) {
  if (metric?.motivo) return metric.motivo
  const descriptions: Record<string, string> = {
    stock_critico_cantidad: 'Artículos agotados o con existencias por debajo de su mínimo, al corte.',
    compras_pendientes_cantidad: 'Líneas de compra con cantidad pendiente de recibir, al corte.',
    herramientas_prestadas: 'Herramientas con un préstamo abierto, al corte.',
    herramientas_vencidas: 'Préstamos abiertos cuya fecha prevista ya venció, al corte.',
    inventario_valorizado: 'Valor de las existencias al corte, expresado en córdobas.',
  }
  return descriptions[key] ?? 'Indicador calculado con los registros logísticos del período.'
}

export function IndicadoresLogisticosPage() {
  const request = useRef(0)
  const [range, setRange] = useState(initialRange)
  const [from, setFrom] = useState(range.desde.slice(0, 19)); const [until, setUntil] = useState(range.hasta.slice(0, 19))
  const [board, setBoard] = useState<TableroLogistico | null>(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [kind, setKind] = useState<TipoDesgloseLogistico>('TODOS'); const [article, setArticle] = useState<Articulo | null>(null); const [articleId, setArticleId] = useState(''); const [articleQ, setArticleQ] = useState(''); const [articlePage, setArticlePage] = useState(1); const [articleMore, setArticleMore] = useState(false); const [articles, setArticles] = useState<Articulo[]>([]); const [articleError, setArticleError] = useState(''); const [articleRetry, setArticleRetry] = useState(0)
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1)
  const load = useCallback(async (desde: string, hasta: string) => { const id = ++request.current; setLoading(true); setError(''); try { const result = await consultarTableroLogistico(desde, hasta); if (id === request.current) setBoard(result) } catch (cause) { if (id === request.current) setError(errorText(cause)) } finally { if (id === request.current) setLoading(false) } }, [])
  useEffect(() => { let live = true; queueMicrotask(() => { if (live) void load(range.desde, range.hasta) }); return () => { live = false; request.current += 1 } }, [load, range])
  useEffect(() => { let live = true; listarArticulos({ q: articleQ.trim().slice(0, 100) || undefined, pagina: articlePage, limite: LIMIT }).then(result => { if (live) { setArticles(old => articlePage === 1 ? result.items : mergeById(old, result.items)); setArticleMore(result.hayMas); setArticleError('') } }).catch(cause => { if (live) setArticleError(errorText(cause)) }); return () => { live = false } }, [articleQ, articlePage, articleRetry])
  const rows = useMemo(() => (board?.desgloses ?? []).filter(row => (kind === 'TODOS' || row.tipo === kind) && (!articleId || rowArticleId(row) === Number(articleId) || row.tipo === 'HERRAMIENTA') && rowValues(row).includes(query.trim().toLocaleLowerCase('es-NI'))), [board, kind, articleId, query])
  const shown = rows.slice((page - 1) * LIMIT, page * LIMIT)
  const metrics = metricDefs.map(([key, label]) => ({ key, label, metric: board?.metricas.find(item => item.clave === key) }))
  const missing = board ? metrics.filter(item => !item.metric).map(item => item.label) : []
  const summary = metrics.slice(0, 3).map(({ key, label, metric }) => ({ label, value: metricValue(metric, key), description: currentMetricExplanation(key, metric) }))
  const validFrom = isoManagua(from); const validUntil = isoManagua(until)
  const validRange = Boolean(validFrom && validUntil && new Date(validFrom).getTime() < new Date(validUntil).getTime() && new Date(validUntil).getTime() - new Date(validFrom).getTime() <= 366 * 86_400_000)
  const applyRange = () => { if (validRange && validFrom && validUntil) { setRange({ desde: validFrom, hasta: validUntil }); setPage(1) } }
  const shownArticles = article && !articles.some(item => item.id === article.id) ? [article, ...articles] : articles
  const sourceTitle = <a className="h7-source-link" href="/inteligencia/origen/logistica">Registros de origen logístico</a>
  const columns: DataTableColumn<DesgloseLogistico>[] = [
    { key: 'tipo', header: 'Tipo', render: row => <SemanticBadge label={typeLabel[row.tipo]} variant={row.tipo === 'HERRAMIENTA' ? 'warning' : row.tipo === 'RECEPCION' ? 'success' : 'info'} icon={typeIcon[row.tipo]} /> },
    { key: 'registro', header: 'Registro', render: row => <a className="h7-source-link" href={sourceHref(row)}>{row.tipo === 'ARTICULO' ? `${row.codigo} · ${row.nombre}` : row.tipo === 'COMPRA_LINEA' ? `${row.compraReferencia} · ${row.articuloCodigo}` : row.tipo === 'RECEPCION' ? `${row.referencia} · ${row.compraReferencia}` : `${row.codigo} · ${row.nombre}`}</a> },
    { key: 'referencia', header: 'Referencia / responsable', render: row => row.tipo === 'ARTICULO' ? 'Existencias al corte' : row.tipo === 'COMPRA_LINEA' ? `${row.proveedor} · ${row.articuloCodigo}` : row.tipo === 'RECEPCION' ? row.proveedor : row.empleadoNombre },
    { key: 'cantidad', header: 'Cantidad', render: row => row.tipo === 'ARTICULO' ? `${row.stock} ${row.unidad}` : row.tipo === 'COMPRA_LINEA' ? `${row.pendiente} ${row.unidad} pendientes de ${row.cantidad}` : row.tipo === 'RECEPCION' ? `${row.cantidad} ${row.unidad}` : fechaHora(row.prestadaEn) },
    { key: 'detalle', header: 'Detalle', render: row => row.tipo === 'ARTICULO' ? <span className="h7-article-detail"><span>Mínimo {row.minimo} {row.unidad} · valorizado C$ {row.valor}</span><span>Consumo neto del período {row.consumoNeto} {row.unidad}</span><span>Existencia media {row.stockMedio === null ? 'Sin base' : `${row.stockMedio} ${row.unidad}`} · rotación {row.rotacion === null ? 'Sin base' : `${row.rotacion} veces`}</span>{row.motivo && <small>{reasonText(row.motivo)}</small>}</span> : row.tipo === 'COMPRA_LINEA' ? <>Recibido {row.recibido} · cancelado {row.cancelado} · promesa {fechaHora(row.prometidaEn)}</> : row.tipo === 'RECEPCION' ? <>Prometida {fechaHora(row.prometidaEn)} · {row.tardia ? <SemanticBadge label="Recepción tardía" icon="!" variant="warning" /> : 'Dentro de fecha'}</> : <>Préstamo previsto hasta {fechaHora(row.previstaEn)}{row.vencida && <> · <SemanticBadge label="Vencida al corte" icon="!" variant="danger" /></>}</> },
  ]
  return <section className="inteligencia-scope" aria-label="Indicadores logísticos"><div className="h7-dashboard">
    <ModuleHeader breadcrumb="Inteligencia" title="Indicadores logísticos" description="Existencias, compromisos de compra, recepciones y herramientas al corte." action={sourceTitle} />
    <form className="h7-range" onSubmit={event => { event.preventDefault(); applyRange() }}><label>Desde<input type="datetime-local" step="1" value={from} onChange={event => setFrom(event.currentTarget.value)} /></label><label>Hasta<input type="datetime-local" step="1" value={until} onChange={event => setUntil(event.currentTarget.value)} /></label><Button type="submit" variant="primary" disabled={!validRange || loading}>Consultar</Button>{from && until && !validRange && <p className="h7-error" role="alert">El rango debe ser válido, Desde debe preceder a Hasta y no puede superar 366 días.</p>}</form>
    {error && <p className="h7-error" role="alert">{error} <Button onClick={() => void load(range.desde, range.hasta)}>Reintentar</Button></p>}
    {board && <p className="h7-coverage" role="note"><SemanticBadge label={board.cobertura.estado === 'COMPLETA' ? 'Cobertura verificada' : board.cobertura.estado === 'PARCIAL' ? 'Cobertura parcial' : 'Sin registros'} icon={board.cobertura.estado === 'COMPLETA' ? '✓' : board.cobertura.estado === 'PARCIAL' ? '!' : '○'} variant={board.cobertura.estado === 'COMPLETA' ? 'success' : board.cobertura.estado === 'PARCIAL' ? 'warning' : 'neutral'} /> Período {fechaHora(board.desde)} a {fechaHora(board.hasta)} · corte evaluado {fechaHora(board.corteEvaluacion)}. Cobertura de datos: {fechaHora(board.cobertura.desde)} a {fechaHora(board.cobertura.hastaVerificada)}. {board.cobertura.observaciones.join(' ')}</p>}
    {board && new Date(board.hasta).getTime() > new Date(board.corteEvaluacion).getTime() && <p className="h7-note">El rango termina después del momento actual; los saldos y préstamos se evaluaron hasta el corte mostrado.</p>}
    {missing.length > 0 && <p className="h7-error" role="alert">No se recibieron todos los indicadores ({missing.join(', ')}). Reintenta la consulta.</p>}
    {board ? <MetricSummary metrics={summary} label="Indicadores logísticos destacados" /> : loading ? <p role="status">Cargando indicadores logísticos…</p> : null}
    {board && <section className="h7-metric-table" aria-labelledby="h7-metrics-title"><h2 id="h7-metrics-title">Indicadores del período</h2><div className="h7-table-scroll" role="region" aria-label="Indicadores logísticos" tabIndex={0}><table><thead><tr><th>Métrica</th><th>Valor</th><th>Fuente</th><th>Lectura</th></tr></thead><tbody>{metrics.map(({ key, label, metric }) => <tr key={key}><th scope="row">{label}</th><td>{metricValue(metric, key)}</td><td>{metric?.fuentes.map(source => metricSources[source] ?? 'Registro logístico').join(', ') || '—'}</td><td>{currentMetricExplanation(key, metric)}</td></tr>)}</tbody></table></div></section>}
    <section className="h7-breakdowns" aria-labelledby="h7-breakdowns-title"><div className="h7-filter"><div><h2 id="h7-breakdowns-title">Desgloses y registros de origen</h2><p>Los conteos y cantidades conservan la unidad de cada artículo; no se suman existencias de unidades distintas.</p></div><label>Tipo de registro<select value={kind} onChange={event => { setKind(event.currentTarget.value as TipoDesgloseLogistico); setPage(1) }}><option value="TODOS">Todos</option><option value="ARTICULO">Artículos</option><option value="COMPRA_LINEA">Compras pendientes</option><option value="RECEPCION">Recepciones</option><option value="HERRAMIENTA">Herramientas prestadas</option></select></label><label>Buscar artículo<input value={articleQ} maxLength={100} onChange={event => { setArticleQ(event.currentTarget.value.slice(0, 100)); setArticlePage(1) }} placeholder="Código o nombre" /></label><label>Filtrar por artículo<select value={articleId} onChange={event => { const next = articles.find(item => String(item.id) === event.target.value) ?? null; setArticleId(event.target.value); setArticle(next); setPage(1) }}><option value="">Todos los artículos</option>{shownArticles.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select></label><div className="h7-filter-controls"><Button type="button" disabled={articlePage <= 1} onClick={() => setArticlePage(value => value - 1)}>Página anterior de artículos</Button><span>{articleMore ? `Página ${articlePage}` : `Página ${articlePage} de ${articlePage}`}</span><Button type="button" disabled={!articleMore} onClick={() => setArticlePage(value => value + 1)}>Más artículos</Button>{articleId && <Button type="button" onClick={() => { setArticleId(''); setArticle(null); setPage(1) }}>Quitar filtro de artículo</Button>}</div></div>
      {articleError && <p className="h7-error" role="alert">No se pudo cargar el selector de artículos. <Button type="button" onClick={() => setArticleRetry(value => value + 1)}>Reintentar artículos</Button></p>}
      {articleId && <p className="h7-note">El filtro por artículo se aplica a existencias, compromisos y recepciones. Los préstamos de herramientas no están vinculados a artículos y se mantienen visibles.</p>}
      {board && <DataTable columns={columns} rows={shown} getRowKey={row => `${row.tipo}-${row.id}`} search={{ value: query, onChange: value => { setQuery(value.slice(0, 100)); setPage(1) }, label: 'Buscar desgloses', placeholder: 'Referencia, artículo, proveedor o empleado' }} pagination={{ pagina: page, limite: LIMIT, hayMas: rows.length > page * LIMIT, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load(range.desde, range.hasta)} emptyTitle="No hay registros para estos filtros" emptyDescription="Amplía el período o cambia los filtros de tipo y artículo." />}
      {!board && loading && <p role="status">Cargando desgloses…</p>}
    </section>
  </div></section>
}
