import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../shared/ui'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { guardarCobertura, historialCobertura, listarCoberturas } from './procedencia.api'
import type { AreaCobertura, CoberturaGerencial, PaginaAuditoriaCobertura } from './procedencia.types'
import './h5-sources.css'

const AREAS: ReadonlyArray<{ id: AreaCobertura; label: string }> = [
  { id: 'COMERCIAL', label: 'Comercial' }, { id: 'FINANCIERO', label: 'Financiero' },
  { id: 'LOGISTICO', label: 'Logístico' }, { id: 'CALIDAD', label: 'Calidad' },
]
const date = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const localDateTime = (value: Date) => new Date(value.getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
const managuaIso = (value: string) => new Date(`${value}:00-06:00`).toISOString()
type CoverageRow = CoberturaGerencial
export function CoberturaPage() {
  const [rows, setRows] = useState<CoverageRow[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [area, setArea] = useState<AreaCobertura>('COMERCIAL'); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false)
  const [formVersion, setFormVersion] = useState(0); const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState(''); const [observacion, setObservacion] = useState('')
  const [historyRevision, setHistoryRevision] = useState(0); const [page, setPage] = useState(1); const [historial, setHistorial] = useState<PaginaAuditoriaCobertura | null>(null); const [historialError, setHistorialError] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await listarCoberturas()) } catch (cause) { setError(errorText(cause)) } finally { setLoading(false) } }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false } }, [load])
  useEffect(() => { let active = true; historialCobertura(area, page).then(value => { if (active) { setHistorial(value); setHistorialError('') } }).catch(cause => { if (active) setHistorialError(errorText(cause)) }); return () => { active = false } }, [area, page, historyRevision])
  const startEdit = (selected: AreaCobertura) => {
    setArea(selected); const current = rows.find(row => row.area === selected); setFormVersion(current?.version ?? 0); const now = new Date()
    setDesde(current ? localDateTime(new Date(current.desde)) : localDateTime(new Date(now.getTime() - 30 * 86400000)))
    setHasta(current ? localDateTime(new Date(current.hastaVerificada)) : localDateTime(now)); setObservacion(current?.observacion ?? ''); setOpen(true)
  }
  const save = async () => {
    if (saving) return
    setSaving(true); setError('')
    try { await guardarCobertura(area, { version: formVersion, desde: managuaIso(desde), hastaVerificada: managuaIso(hasta), ...(observacion.trim() ? { observacion: observacion.trim() } : {}) }); setOpen(false); await load(); setHistoryRevision(revision => revision + 1) }
    catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }
  const columns: DataTableColumn<CoberturaGerencial>[] = [
    { key: 'area', header: 'Área', render: row => AREAS.find(item => item.id === row.area)?.label },
    { key: 'rango', header: 'Período verificado', render: row => `${date(row.desde)} – ${date(row.hastaVerificada)}` },
    { key: 'responsable', header: 'Responsable', render: row => row.responsable.nombre },
    { key: 'estado', header: 'Registro', render: () => <SemanticBadge label="Verificación registrada" variant="info" icon="✓" /> },
    { key: 'accion', header: 'Acción', render: row => <Button onClick={() => startEdit(row.area)}>Actualizar</Button> },
  ]
  const auditColumns: DataTableColumn<PaginaAuditoriaCobertura['items'][number]>[] = [
    { key: 'fecha', header: 'Fecha', render: row => date(row.fecha) },
    { key: 'actor', header: 'Responsable', render: row => row.responsable?.nombre ?? 'Usuario' },
    { key: 'cambio', header: 'Cambio', render: row => { const snapshot = row.nuevos ?? row.anteriores; return <span>{row.accion === 'CREAR' ? 'Registro inicial' : 'Actualización'}{snapshot ? ` · ${date(snapshot.desde)} a ${date(snapshot.hastaVerificada)}` : ''}</span> } },
  ]
  const valid = Boolean(desde && hasta && managuaIso(desde) < managuaIso(hasta) && managuaIso(hasta) <= new Date().toISOString())
  return <section className="h5-source" aria-label="Cobertura de fuentes">
    <ModuleHeader breadcrumb="Inteligencia / Registros de origen" title="Cobertura de fuentes" description="Declara el período verificado por área. El tablero compara esta cobertura con cada rango consultado." action={<Button variant="primary" onClick={() => startEdit(area)} disabled={open || saving}>Registrar cobertura</Button>} />
    {error && <p role="alert" className="h5-error">{error} <Button onClick={() => void load()}>Reintentar</Button></p>}
    {!open && <DataTable columns={columns} rows={rows} getRowKey={row => row.area} pagination={{ pagina: 1, limite: 4, hayMas: false, onPageChange: () => undefined }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay cobertura declarada" emptyDescription="Registra el período verificado para cada área." />}
    {!open && <section className="h5-subsection" aria-labelledby="coverage-history-title"><h2 id="coverage-history-title">Historial de cambios</h2>
      <label>Área<select disabled={open || saving} value={area} onChange={event => { setArea(event.currentTarget.value as AreaCobertura); setPage(1) }}>{AREAS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      {historialError ? <p role="alert">{historialError} <Button onClick={() => { setHistorialError(''); void historialCobertura(area, page).then(setHistorial).catch(cause => setHistorialError(errorText(cause))) }}>Reintentar</Button></p> : <DataTable columns={auditColumns} rows={historial?.items ?? []} getRowKey={row => row.id} pagination={{ pagina: historial?.pagina ?? 1, limite: historial?.limite ?? 10, hayMas: historial?.hayMas ?? false, onPageChange: setPage }} state={!historial ? 'loading' : 'ready'} emptyTitle="Sin cambios registrados" />}
    </section>}
    {open && <section className="h5-dialog h5-form-page" aria-labelledby="coverage-form-title"><h2 id="coverage-form-title">Registrar cobertura · {AREAS.find(item => item.id === area)?.label}</h2><p>El responsable será el usuario autenticado. La cobertura efectiva se determina para el rango consultado.</p>
      <label>Área<select disabled={saving} value={area} onChange={event => startEdit(event.currentTarget.value as AreaCobertura)}>{AREAS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Desde<input disabled={saving} type="datetime-local" value={desde} onChange={event => setDesde(event.currentTarget.value)} required /></label><label>Hasta verificada<input disabled={saving} type="datetime-local" value={hasta} onChange={event => setHasta(event.currentTarget.value)} required /></label><label>Observación (opcional)<textarea disabled={saving} maxLength={1000} value={observacion} onChange={event => setObservacion(event.currentTarget.value)} /></label>
      <div className="h5-dialog__actions"><Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button><Button variant="primary" disabled={saving || !valid} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar cobertura'}</Button></div>
    </section>}
  </section>
}
