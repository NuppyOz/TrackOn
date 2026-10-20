import { AsistenteIndicadores } from '../asistente'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'
import { DataTable, MetricSummary, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { consultarTableroCalidad } from './calidad.api'
import { fechaHora, initialRange, isoManagua, managuaLocal } from './fechas'
import type { DesgloseCalidad, MetricaCalidad, TableroCalidad, TipoDesgloseCalidad } from './calidad.types'
import './calidad.css'

const PAGE = 25
const metricsDefinition = [
  ['garantias_vigentes', 'Garantías vigentes'], ['reclamos_abiertos', 'Reclamos abiertos'], ['reincidencias', 'Reincidencias'], ['retrabajos', 'Retrabajos'],
  ['fallas_repetidas_grupos', 'Grupos de fallas repetidas'], ['sla_respuesta_porcentaje', 'SLA de respuesta'], ['sla_resolucion_porcentaje', 'SLA de resolución'],
  ['correctivas_abiertas', 'Acciones correctivas abiertas'], ['correctivas_vencidas', 'Acciones correctivas vencidas'],
] as const
const sourceNames: Record<string, string> = {
  garantias_gerenciales: 'Garantías', casos_calidad_gerenciales: 'Casos de calidad', retrabajos_gerenciales: 'Retrabajos', correctivas_gerenciales: 'Acciones correctivas',
}
const typeLabels: Record<Exclude<TipoDesgloseCalidad, 'TODOS'>, string> = {
  GARANTIA: 'Garantía', CASO: 'Caso', RETRABAJO: 'Retrabajo', CORRECTIVA: 'Acción correctiva', FALLA_REPETIDA: 'Grupo de fallas repetidas',
}
const typeIcon: Record<Exclude<TipoDesgloseCalidad, 'TODOS'>, string> = { GARANTIA: '✓', CASO: '●', RETRABAJO: '↻', CORRECTIVA: '✓', FALLA_REPETIDA: '!' }
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo consultar el tablero de calidad.'
const time = (value: string | null) => value ? fechaHora(value) : 'No registrado'
const slaBadge = (evaluable: boolean, cumple: boolean | null) => !evaluable
  ? <SemanticBadge label="No evaluable al corte" variant="neutral" />
  : cumple ? <SemanticBadge label="Cumple" variant="success" /> : <SemanticBadge label="Fuera de plazo" variant="warning" />

function metricValue(metric: MetricaCalidad | undefined) {
  if (!metric) return 'Dato no recibido'
  if (metric.estado === 'SIN_BASE_DE_CALCULO' || metric.valor === null) return 'Sin base'
  return metric.unidad === 'porcentaje' ? `${metric.valor}%` : String(metric.valor)
}
function metricReading(metric: MetricaCalidad | undefined) {
  if (!metric) return 'El servidor no devolvió esta métrica.'
  if (metric.unidad === 'porcentaje') {
    if (metric.estado === 'SIN_BASE_DE_CALCULO' || metric.valor === null) return metric.motivo ?? 'No hay plazos evaluables en el rango.'
    return metric.base ? `${metric.base.numerador} de ${metric.base.denominador} plazos evaluables` : 'Falta el desglose de la base de cálculo.'
  }
  return metric.motivo ?? 'Conteo según el corte de evaluación.'
}
function badgeEstado(value: string) {
  const variant = value === 'VIGENTE' || value === 'CERRADO' || value === 'RESUELTO' ? 'success' : value === 'FUTURA' || value === 'EN_ATENCION' ? 'info' : value === 'VENCIDA' || value === 'ABIERTO' ? 'warning' : 'neutral'
  return <SemanticBadge label={value.replace('_', ' ')} variant={variant} />
}
function sourceLinks(row: DesgloseCalidad) {
  if (row.tipo === 'GARANTIA') return <a href={`/inteligencia/origen/calidad?garantiaId=${row.id}`}>{row.referencia}</a>
  if (row.tipo === 'CASO') return <a href={`/inteligencia/origen/calidad?casoId=${row.id}`}>{row.referencia}</a>
  if (row.tipo === 'CORRECTIVA') return <a href={`/inteligencia/origen/calidad?correctivaId=${row.id}`}>{row.descripcion}</a>
  if (row.tipo === 'RETRABAJO') return <a href={`/inteligencia/origen/calidad?casoId=${row.casoId}`}>{row.referenciaTrabajo} · {row.casoReferencia}</a>
  return <span>{row.clienteId} · {row.activoReferencia} · {row.codigoFalla}</span>
}
function searchText(row: DesgloseCalidad): string {
  if (row.tipo === 'GARANTIA') return `${row.referencia} ${row.clienteNombre} ${row.clienteId} ${row.activoReferencia}`
  if (row.tipo === 'CASO') return `${row.referencia} ${row.clienteNombre} ${row.clienteId} ${row.activoReferencia} ${row.codigoFalla} ${row.estadoAlCorte}`
  if (row.tipo === 'RETRABAJO') return `${row.referenciaTrabajo} ${row.casoReferencia} ${row.casoId} ${row.ordenId ?? ''}`
  if (row.tipo === 'CORRECTIVA') return `${row.descripcion} ${row.casoReferencia} ${row.casoId} ${row.responsableNombre} ${row.responsableId}`
  return `${row.clave} ${row.clienteId} ${row.activoReferencia} ${row.codigoFalla} ${row.casoIds.join(' ')}`
}
function rowAsset(row: DesgloseCalidad) {
  if ('activoReferencia' in row) return row.activoReferencia
  return ''
}
function rowFailure(row: DesgloseCalidad) {
  if (row.tipo === 'CASO' || row.tipo === 'FALLA_REPETIDA') return row.codigoFalla
  return ''
}
function rowKey(row: DesgloseCalidad) { return 'clave' in row ? `${row.tipo}-${row.clave}` : `${row.tipo}-${row.id}` }

export function IndicadoresCalidadPage() {
  const requestId = useRef(0)
  const [range, setRange] = useState(initialRange)
  const [draftFrom, setDraftFrom] = useState(() => managuaLocal(range.desde))
  const [draftUntil, setDraftUntil] = useState(() => managuaLocal(range.hasta))
  const [board, setBoard] = useState<TableroCalidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [kind, setKind] = useState<TipoDesgloseCalidad>('TODOS')
  const [asset, setAsset] = useState('')
  const [failure, setFailure] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const load = useCallback((desde: string, hasta: string) => {
    const request = ++requestId.current
    setLoading(true); setError(''); setBoard(null)
    void consultarTableroCalidad(desde, hasta).then((value) => { if (request === requestId.current) setBoard(value) })
      .catch((cause: unknown) => { if (request === requestId.current) setError(message(cause)) })
      .finally(() => { if (request === requestId.current) setLoading(false) })
    return () => { if (request === requestId.current) requestId.current++ }
  }, [])
  useEffect(() => { let active = true; let cancel = () => {}; queueMicrotask(() => { if (active) cancel = load(range.desde, range.hasta) }); return () => { active = false; cancel() } }, [load, range])

  const fromIso = isoManagua(draftFrom); const untilIso = isoManagua(draftUntil)
  const fromTime = fromIso ? new Date(fromIso).getTime() : Number.NaN; const untilTime = untilIso ? new Date(untilIso).getTime() : Number.NaN
  const validRange = Boolean(fromIso && untilIso && fromTime < untilTime && untilTime - fromTime <= 366 * 86_400_000)
  const applyRange = () => { if (validRange && fromIso && untilIso) { setRange({ desde: fromIso, hasta: untilIso }); setPage(1) } }
  const metrics = metricsDefinition.map(([key, label]) => ({ key, label, metric: board?.metricas.find((row) => row.clave === key) }))
  const missingMetrics = board ? metrics.filter(({ metric }) => !metric || (metric.unidad === 'porcentaje' && metric.estado === 'CALCULADO' && metric.base === undefined)).map(({ label }) => label) : []
  const summary = metrics.slice(0, 4).map(({ metric, label }) => ({ label, value: metricValue(metric), description: metricReading(metric) }))
  const filtered = useMemo(() => (board?.desgloses ?? []).filter((row) => (kind === 'TODOS' || row.tipo === kind)
    && (!asset.trim() || rowAsset(row).toLocaleLowerCase('es-NI').includes(asset.trim().toLocaleLowerCase('es-NI')))
    && (!failure.trim() || rowFailure(row).toLocaleLowerCase('es-NI').includes(failure.trim().toLocaleLowerCase('es-NI')))
    && searchText(row).toLocaleLowerCase('es-NI').includes(query.trim().toLocaleLowerCase('es-NI'))), [board, kind, asset, failure, query])
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE)
  const columns: DataTableColumn<DesgloseCalidad>[] = [
    { key: 'tipo', header: 'Fuente', render: (row) => <SemanticBadge label={typeLabels[row.tipo]} variant={row.tipo === 'GARANTIA' ? 'success' : row.tipo === 'FALLA_REPETIDA' ? 'warning' : row.tipo === 'CORRECTIVA' ? 'info' : 'neutral'} icon={typeIcon[row.tipo]} /> },
    { key: 'registro', header: 'Registro', render: (row) => sourceLinks(row) },
    { key: 'cliente', header: 'Cliente', render: (row) => 'clienteNombre' in row ? `${row.clienteNombre} · #${row.clienteId}` : row.tipo === 'FALLA_REPETIDA' ? `Cliente #${row.clienteId}` : row.casoReferencia },
    { key: 'activo', header: 'Activo / falla', render: (row) => 'activoReferencia' in row ? `${row.activoReferencia}${row.tipo === 'CASO' ? ` · ${row.codigoFalla}` : row.tipo === 'FALLA_REPETIDA' ? ` · ${row.codigoFalla}` : ''}` : '—' },
    { key: 'fecha', header: 'Fecha', render: (row) => row.tipo === 'GARANTIA' ? `${fechaHora(row.inicio)} – ${fechaHora(row.fin)}` : row.tipo === 'CASO' ? fechaHora(row.abiertaEn) : row.tipo === 'RETRABAJO' ? fechaHora(row.fechaEfectiva) : row.tipo === 'CORRECTIVA' ? `${fechaHora(row.creadaEn)} · vence ${fechaHora(row.venceEn)}` : `${row.cantidad} casos · ventana de 90 días al corte` },
    { key: 'estado', header: 'Estado al corte', render: (row) => row.tipo === 'GARANTIA' ? badgeEstado(row.vigente ? 'VIGENTE' : 'VENCIDA') : row.tipo === 'CASO' ? <span className="h8-sla">{badgeEstado(row.estadoAlCorte)}<small>Respuesta: {slaBadge(row.respuestaEvaluable, row.respuestaCumple)} Resolución: {slaBadge(row.resolucionEvaluable, row.resolucionCumple)}</small></span> : row.tipo === 'CORRECTIVA' ? <span className="h8-sla">{badgeEstado(row.abiertaAlCorte ? 'ABIERTA' : 'CERRADA')}{row.vencidaAlCorte && <SemanticBadge label="Vencida al corte" variant="warning" />}</span> : row.tipo === 'FALLA_REPETIDA' ? <span>{row.cantidad} casos agrupados por cliente, activo y falla</span> : row.ordenId ? `Orden #${row.ordenId}` : 'Sin orden asociada' },
    { key: 'hitos', header: 'Trazabilidad', render: (row) => row.tipo === 'CASO' ? <>Plazo de respuesta {time(row.respuestaLimiteEn)} · respuesta {time(row.respondidaEn)}<br />Plazo de resolución {time(row.resolucionLimiteEn)} · resolución {time(row.resueltaEn)}<br />Cierre {time(row.cerradaEn)}</> : row.tipo === 'CORRECTIVA' ? <>Responsable: {row.responsableNombre}<br />Cierre: {time(row.cerradaEn)}</> : row.tipo === 'FALLA_REPETIDA' ? <span className="h8-case-links">{row.casoIds.map((id) => <a key={id} href={`/inteligencia/origen/calidad?casoId=${id}`}>Caso #{id}</a>)}</span> : row.tipo === 'RETRABAJO' ? <>Caso {row.casoReferencia} · trabajo {row.referenciaTrabajo}</> : `Cliente: ${row.clienteNombre}` },
  ]
  const sourceTitle = <a href="/inteligencia/origen/calidad">Registros de origen de calidad</a>

  return <section className="inteligencia-scope" aria-label="Indicadores de calidad"><div className="h8-dashboard">
    <ModuleHeader breadcrumb="Inteligencia" title="Indicadores de calidad" description="Garantías, reclamos, retrabajos, fallas repetidas y acciones correctivas al corte." action={sourceTitle} />
    <form className="h8-range" onSubmit={(event) => { event.preventDefault(); applyRange() }}><label>Desde<input type="datetime-local" step="1" value={draftFrom} onChange={(event) => setDraftFrom(event.currentTarget.value)} /></label><label>Hasta<input type="datetime-local" step="1" value={draftUntil} onChange={(event) => setDraftUntil(event.currentTarget.value)} /></label><Button type="submit" variant="primary" disabled={!validRange || loading}>Consultar</Button>{draftFrom && draftUntil && !validRange && <p className="h8-error" role="alert">El rango debe ser válido, Desde debe preceder a Hasta y no puede superar 366 días.</p>}</form>
    {board && !loading && !error && <AsistenteIndicadores key={`${board.desde}|${board.hasta}|${board.corteEvaluacion}`} area="calidad" desde={board.desde} hasta={board.hasta} />}
    {error && <p className="h8-error" role="alert">{error} <Button type="button" onClick={() => void load(range.desde, range.hasta)}>Reintentar</Button></p>}
    {board && <p className="h8-coverage" role="note"><SemanticBadge label={board.cobertura.estado === 'COMPLETA' ? 'Cobertura verificada para el rango' : board.cobertura.estado === 'PARCIAL' ? 'Cobertura parcial' : 'Sin registros de cobertura'} variant={board.cobertura.estado === 'COMPLETA' ? 'success' : board.cobertura.estado === 'PARCIAL' ? 'warning' : 'neutral'} /> El tablero refleja registros capturados en las fuentes conectadas, no actividad fuera de ese alcance. Período consultado: {fechaHora(board.desde)} a {fechaHora(board.hasta)}. Cobertura verificada desde {fechaHora(board.cobertura.desde)} hasta {fechaHora(board.cobertura.hastaVerificada)}. {board.cobertura.observaciones.join(' ')} Corte evaluado: {fechaHora(board.corteEvaluacion)}.</p>}
    {board && new Date(board.hasta).getTime() > new Date(board.corteEvaluacion).getTime() && <p className="h8-note">El rango solicitado llega hasta {fechaHora(board.hasta)}; los indicadores se evaluaron hasta el corte mostrado por el servidor.</p>}
    {missingMetrics.length > 0 && <p className="h8-error" role="alert">La respuesta está incompleta: faltan métricas o bases de cálculo para {missingMetrics.join(', ')}. Reintenta la consulta.</p>}
    {board ? <MetricSummary metrics={summary} label="Indicadores destacados de calidad" /> : loading ? <p role="status">Cargando indicadores de calidad…</p> : null}
    {board && <section className="h8-metric-table" aria-labelledby="h8-metrics-title"><h2 id="h8-metrics-title">Indicadores del período</h2><div className="h8-table-scroll" role="region" aria-label="Nueve métricas de calidad" tabIndex={0}><table><thead><tr><th>Métrica</th><th>Valor</th><th>Base o lectura</th><th>Fuentes</th></tr></thead><tbody>{metrics.map(({ key, label, metric }) => <tr key={key}><th scope="row">{label}</th><td>{metricValue(metric)}</td><td>{metricReading(metric)}</td><td>{metric?.fuentes.map((source) => sourceNames[source] ?? 'Registro de calidad').join(', ') ?? 'No recibido'}</td></tr>)}</tbody></table></div></section>}
    <section className="h8-breakdowns" aria-labelledby="h8-breakdowns-title"><div className="h8-section-heading"><div><h2 id="h8-breakdowns-title">Desgloses y registros relacionados</h2><p>Los estados y evaluaciones corresponden al corte calculado por el servidor.</p></div><label>Tipo<select value={kind} onChange={(event) => { setKind(event.currentTarget.value as TipoDesgloseCalidad); setPage(1) }}><option value="TODOS">Todos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Activo<input value={asset} maxLength={100} onChange={(event) => { setAsset(event.currentTarget.value.slice(0, 100)); setPage(1) }} placeholder="Referencia del activo" /></label><label>Código de falla<input value={failure} maxLength={60} onChange={(event) => { setFailure(event.currentTarget.value.slice(0, 60)); setPage(1) }} placeholder="Código exacto o parcial" /></label></div>
      {board && <DataTable columns={columns} rows={pageRows} getRowKey={rowKey} search={{ value: query, onChange: (value) => { setQuery(value.slice(0, 100)); setPage(1) }, label: 'Buscar desgloses', placeholder: 'Referencia, cliente, responsable o caso' }} pagination={{ pagina: page, limite: PAGE, hayMas: filtered.length > page * PAGE, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load(range.desde, range.hasta)} emptyTitle="No hay registros para este período y filtros" emptyDescription="Amplía el rango o ajusta tipo, activo y código de falla." />}
      {!board && loading && <p role="status">Cargando desgloses…</p>}
    </section>
    {board && <p className="h8-unsassigned">Casos con plazos incompletos al corte: <strong>{board.registrosSinAsignar}</strong></p>}
  </div></section>
}
