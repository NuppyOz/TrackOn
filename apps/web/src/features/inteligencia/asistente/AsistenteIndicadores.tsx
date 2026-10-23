import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../shared/ui'
import { SemanticBadge } from '../../erp-ui/components'
import { consultarDisponibilidadAsistente, solicitarInterpretacion } from './asistente.api'
import type { AreaAsistente, DisponibilidadAsistente, EstadoAsistente, InterpretacionAsistente } from './asistente.types'
import './asistente.css'

const areaNames: Record<AreaAsistente, string> = {
  comercial: 'Comercial', financiero: 'Financiero', logistico: 'Logístico', calidad: 'Calidad',
}
const sourceNames: Record<AreaAsistente, Record<string, string>> = {
  comercial: { cotizaciones_comerciales: 'Cotizaciones', ventas_comerciales: 'Ventas', contratos_gerenciales: 'Contratos' },
  financiero: { comprobantes_gerenciales: 'Comprobantes', cobros_gerenciales: 'Cobros', aplicaciones_cobros_gerenciales: 'Aplicaciones de cobro', costos_gerenciales: 'Costos', facturables_gerenciales: 'Servicios realizados' },
  logistico: { articulos_gerenciales: 'Artículos', movimientos_gerenciales: 'Movimientos logísticos', compras_gerenciales: 'Compras', lineas_compras_gerenciales: 'Líneas de compra', recepciones_gerenciales: 'Recepciones', prestamos_herramientas_gerenciales: 'Préstamos de herramientas' },
  calidad: { garantias_gerenciales: 'Garantías', casos_calidad_gerenciales: 'Casos de calidad', retrabajos_gerenciales: 'Retrabajos', correctivas_gerenciales: 'Acciones correctivas' },
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la solicitud.'
const dateLabel = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(date)
}

export interface AsistenteIndicadoresProps {
  area: AreaAsistente
  desde: string
  hasta: string
}

export function AsistenteIndicadores({ area, desde, hasta }: Readonly<AsistenteIndicadoresProps>) {
  const key = `${area}|${desde}|${hasta}`
  const requestRef = useRef(0)
  const [availability, setAvailability] = useState<{ key: string; value?: DisponibilidadAsistente; error?: string; loading: boolean }>({ key: '', loading: true })
  const [state, setState] = useState<EstadoAsistente>({ key: '', loading: false })
  const [availabilityRevision, setAvailabilityRevision] = useState(0)
  const available = availability.key === key ? availability.value : undefined
  const availabilityError = availability.key === key ? availability.error : undefined
  const currentState = state.key === key ? state : undefined
  const result = currentState?.interpretacion

  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    ++requestRef.current
    queueMicrotask(() => {
      if (!active) return
      controller = new AbortController()
      setAvailability({ key, loading: true })
      void consultarDisponibilidadAsistente(controller.signal)
        .then(value => { if (active) setAvailability({ key, value, loading: false }) })
        .catch(error => { if (active && !controller?.signal.aborted) setAvailability({ key, error: errorMessage(error), loading: false }) })
    })
    return () => { active = false; controller?.abort() }
  }, [key, availabilityRevision])

  const explain = () => {
    if (!available?.disponible || currentState?.loading) return
    const request = ++requestRef.current
    const controller = new AbortController()
    setState({ key, loading: true })
    void solicitarInterpretacion(area, desde, hasta, controller.signal)
      .then(value => { if (request === requestRef.current) setState({ key, interpretacion: value }) })
      .catch(error => { if (request === requestRef.current && !controller.signal.aborted) setState({ key, error: errorMessage(error) }) })
    pending.current = { request, controller }
  }
  const pending = useRef<{ request: number; controller: AbortController } | undefined>(undefined)

  useEffect(() => () => {
    const current = pending.current
    if (current) { current.controller.abort(); if (current.request === requestRef.current) requestRef.current++ }
  }, [key])

  return <section className="asistente-indicadores" aria-label={`Interpretación de indicadores ${areaNames[area]}`}>
    <div className="asistente-heading"><div><h2>Interpretación de indicadores</h2><p>Solicita una lectura breve de los datos agregados de este período.</p></div>
      <Button type="button" variant="secondary" onClick={explain} disabled={!available?.disponible || Boolean(currentState?.loading) || Boolean(availabilityError)} loading={Boolean(currentState?.loading)}>Explicar indicadores</Button>
    </div>
    {availability.loading && availability.key === key && <p role="status">Comprobando disponibilidad…</p>}
    {availabilityError && <p className="asistente-error" role="alert">{availabilityError} <Button type="button" variant="secondary" onClick={() => setAvailabilityRevision(value => value + 1)}>Reintentar</Button></p>}
    {available?.disponible === false && <p className="asistente-note" role="status">El asistente no está configurado.</p>}
    {currentState?.loading && <p role="status">Preparando interpretación…</p>}
    {currentState?.error && <p className="asistente-error" role="alert">{currentState.error} <Button type="button" variant="secondary" onClick={explain} disabled={!available?.disponible}>Reintentar</Button></p>}
    {result && <Interpretation result={result} area={area} />}
  </section>
}

function Interpretation({ result, area }: { result: InterpretacionAsistente; area: AreaAsistente }) {
  const readableSources = result.fuentes.map(source => sourceNames[area][source] ?? 'Fuente de indicadores')
  return <article className="asistente-result" aria-label="Interpretación generada">
    <div className="asistente-result__meta"><SemanticBadge label="Interpretación generada" variant="info" icon="✦" /><span>{areaNames[area]} · {dateLabel(result.desde)} – {dateLabel(result.hasta)}</span><span>Corte: {dateLabel(result.corte)}</span><span>Generada: {dateLabel(result.generadaEn)}</span><span>Referencia: {result.snapshotId.slice(0, 12)}</span></div>
    <p className="asistente-result__text">{result.texto}</p>
    <p className="asistente-result__sources"><strong>Fuentes:</strong> {readableSources.length ? readableSources.join(', ') : 'No especificadas'}</p>
  </article>
}
