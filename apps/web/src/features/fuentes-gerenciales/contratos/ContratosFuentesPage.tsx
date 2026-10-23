import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionMenu, Button } from '../../../shared/ui'
import { createIdempotencyKey } from '../../../shared/idempotency'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { DataTable, ModuleHeader, SemanticBadge, type DataTableColumn } from '../../erp-ui/components'
import { crearContrato, listarContratos, obtenerContrato, renovarContrato, terminarContrato } from './contratos.api'
import type { ContratoGerencial, ContratoNuevo, PaginaContratos } from './contratos.types'
import '../procedencia/h5-sources.css'

const LIMITE = 25
const when = (value: string) => new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeZone: 'America/Managua' }).format(new Date(value))
const money = (value: string) => `C$ ${value}`
const err = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const newDraft = () => ({ clienteId: '', referencia: '', inicio: '', fin: '', importe: '', observacion: '', terminadoEn: '' })
type Mode = 'create' | 'renew' | 'terminate' | null
const managuaIso = (value: string) => new Date(`${value}:00-06:00`).toISOString()
const managuaInput = (value: string) => new Date(new Date(value).getTime() - 6 * 60 * 60 * 1000).toISOString().slice(0, 16)
export function ContratosFuentesPage() {
  const [result, setResult] = useState<PaginaContratos | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [q, setQ] = useState(''); const [clienteId, setClienteId] = useState(''); const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const listRequest = useRef(0)
  const [mode, setMode] = useState<Mode>(null); const [draft, setDraft] = useState(newDraft()); const [detail, setDetail] = useState<ContratoGerencial | null>(null)
  const idempotencyKey = useRef('')
  const ensureKey = (): string => { if (!idempotencyKey.current) idempotencyKey.current = createIdempotencyKey(); return idempotencyKey.current }
  const resetKey = () => { idempotencyKey.current = '' }
  const load = useCallback(async () => { const request = ++listRequest.current; setLoading(true); setError(''); try { const data = await listarContratos({ q: q.trim() || undefined, clienteId: clienteId ? Number(clienteId) : undefined, pagina: page, limite: LIMITE }); if (request === listRequest.current) setResult(data) } catch (cause) { if (request === listRequest.current) setError(err(cause)) } finally { if (request === listRequest.current) setLoading(false) } }, [q, clienteId, page])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false; listRequest.current += 1 } }, [load])
  useEffect(() => { let active = true; listarClientes().then(value => { if (active) setClientes(value) }).catch(cause => { if (active) setError(err(cause)) }); return () => { active = false } }, [])
  useEffect(() => { const id = Number(new URLSearchParams(window.location.search).get('contratoId')); if (Number.isInteger(id) && id > 0 && id <= 2_147_483_647) obtenerContrato(id).then(setDetail).catch(cause => setError(err(cause))) }, [])
  const openCreate = () => { resetKey(); setDetail(null); setDraft(newDraft()); setMode('create') }
  const openRenew = (contract: ContratoGerencial) => { resetKey(); setDetail(contract); setDraft({ ...newDraft(), clienteId: String(contract.clienteId), inicio: managuaInput(contract.fin) }); setMode('renew') }
  const close = () => { if (!saving) setMode(null) }
  const submit = async () => {
    if (!mode || saving) return
    setSaving(true); setError('')
    try {
      if (mode === 'create') {
        const payload: ContratoNuevo = { clienteId: Number(draft.clienteId), referencia: draft.referencia.trim(), inicio: managuaIso(draft.inicio), fin: managuaIso(draft.fin), importe: draft.importe.trim(), ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}) }
        await crearContrato(payload, ensureKey())
      } else if (mode === 'renew' && detail) {
        await renovarContrato(detail.id, detail.version, { referencia: draft.referencia.trim(), inicio: managuaIso(draft.inicio), fin: managuaIso(draft.fin), importe: draft.importe.trim(), ...(draft.observacion.trim() ? { observacion: draft.observacion.trim() } : {}) }, ensureKey())
      } else if (mode === 'terminate' && detail) {
        await terminarContrato(detail.id, { version: detail.version, terminadoEn: managuaIso(draft.terminadoEn), motivo: draft.observacion.trim() }, ensureKey())
      }
      resetKey(); setMode(null); setDetail(null); await load()
    } catch (cause) { setError(err(cause)) }
    finally { setSaving(false) }
  }
  const view = async (id: number) => { if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) return; setError(''); try { setDetail(await obtenerContrato(id)); setMode(null) } catch (cause) { setError(err(cause)) } }
  const columns: DataTableColumn<ContratoGerencial>[] = [
    { key: 'referencia', header: 'Contrato', render: row => <button className="h5-link" type="button" onClick={() => void view(row.id)}>{row.referencia}</button> },
    { key: 'clienteNombre', header: 'Cliente', render: row => row.clienteNombre },
    { key: 'vigencia', header: 'Vigencia', render: row => `${when(row.inicio)} – ${when(row.fin)}` },
    { key: 'importe', header: 'Importe', render: row => money(row.importe) },
    { key: 'estado', header: 'Estado', render: row => <SemanticBadge label={row.terminadoEn ? 'Terminado' : row.siguienteId ? 'Renovado' : 'Registrado'} variant={row.terminadoEn ? 'neutral' : 'success'} /> },
    { key: 'action', header: 'Acciones', render: row => <ActionMenu label={`Acciones de ${row.referencia}`}><button type="button" onClick={() => void view(row.id)}>Ver ficha</button>{!row.terminadoEn && !row.siguienteId && <button type="button" onClick={() => openRenew(row)}>Renovar</button>}</ActionMenu> },
  ]
  const isFormValid = mode === 'terminate' ? Boolean(draft.observacion.trim() && draft.terminadoEn && managuaIso(draft.terminadoEn) >= (detail?.inicio ?? '') && managuaIso(draft.terminadoEn) <= (detail?.fin ?? '') && managuaIso(draft.terminadoEn) <= new Date().toISOString()) : Boolean(draft.referencia.trim() && draft.inicio && draft.fin && managuaIso(draft.inicio) < managuaIso(draft.fin) && /^\d{1,14}(\.\d{1,2})?$/.test(draft.importe) && Number(draft.importe) >= 0 && (mode === 'renew' || draft.clienteId))
  return <section className="h5-source" aria-labelledby="contracts-title">
    <ModuleHeader breadcrumb="Inteligencia / Registros de origen" title="Contratos" description="Fichas contractuales registradas. Una renovación crea un contrato sucesor y conserva el vínculo con el anterior." action={<Button variant="primary" onClick={openCreate} disabled={Boolean(mode) || saving}>Nuevo contrato</Button>} />
    {error && <p role="alert" className="h5-error">{error}</p>}
    {!mode && (detail ? <section className="h5-detail"><div className="h5-detail-head"><h2>{detail.referencia} · {detail.clienteNombre}</h2><Button onClick={() => setDetail(null)} disabled={saving}>Volver al listado</Button></div><dl><div><dt>Vigencia</dt><dd>{when(detail.inicio)} – {when(detail.fin)}</dd></div><div><dt>Importe</dt><dd>{money(detail.importe)} NIO</dd></div><div><dt>Registrado</dt><dd>{when(detail.registradoEn)}</dd></div><div><dt>Terminado</dt><dd>{detail.terminadoEn ? when(detail.terminadoEn) : 'No terminado'}</dd></div><div><dt>Contrato anterior</dt><dd>{detail.anteriorId ? <button type="button" className="h5-link" onClick={() => void view(detail.anteriorId!)}>#{detail.anteriorId}</button> : '—'}</dd></div><div><dt>Sucesor</dt><dd>{detail.siguienteId ? <button type="button" className="h5-link" onClick={() => void view(detail.siguienteId!)}>#{detail.siguienteId}</button> : '—'}</dd></div><div><dt>Observación</dt><dd>{detail.observacion || 'Sin observación'}</dd></div></dl>{!detail.terminadoEn && !detail.siguienteId && <div className="h5-detail-actions"><Button onClick={() => openRenew(detail)} disabled={saving}>Renovar contrato</Button><Button disabled={saving} onClick={() => { resetKey(); const now = new Date(); const effective = now > new Date(detail.fin) ? new Date(detail.fin) : now; setDraft({ ...newDraft(), observacion: '', terminadoEn: managuaInput(effective.toISOString()) }); setMode('terminate') }}>Terminar contrato</Button></div>}</section> : <>
      <div className="h5-filters"><label>Cliente<select value={clienteId} onChange={event => { setClienteId(event.currentTarget.value); setPage(1) }}><option value="">Todos los clientes</option>{clientes.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label></div>
      <DataTable columns={columns} rows={result?.items ?? []} getRowKey={row => row.id} search={{ value: q, onChange: value => { setQ(value.slice(0, 100)); setPage(1) }, placeholder: 'Referencia o cliente', label: 'Buscar contratos' }} pagination={{ pagina: result?.pagina ?? page, limite: result?.limite ?? LIMITE, hayMas: result?.hayMas ?? false, onPageChange: setPage }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load()} emptyTitle="No hay contratos registrados" emptyDescription="Registra una ficha contractual para consultar su vigencia." />
    </>) }
    {mode && <section className="h5-dialog h5-form-page" aria-labelledby="contract-form-title"><h2 id="contract-form-title">{mode === 'create' ? 'Nuevo contrato' : mode === 'renew' ? `Renovar ${detail?.referencia ?? ''}` : `Terminar ${detail?.referencia ?? ''}`}</h2>
      {mode === 'terminate' ? <><p>La ficha se conserva en el historial. Elige una fecha dentro de la vigencia.</p><label>Fecha de terminación<input disabled={saving} type="datetime-local" min={detail ? managuaInput(detail.inicio) : undefined} max={detail ? managuaInput(new Date(detail.fin) < new Date() ? detail.fin : new Date().toISOString()) : undefined} value={draft.terminadoEn} onChange={event => { resetKey(); setDraft({ ...draft, terminadoEn: event.currentTarget.value }) }} required /></label><label>Motivo<textarea disabled={saving} maxLength={1000} value={draft.observacion} onChange={event => { resetKey(); setDraft({ ...draft, observacion: event.currentTarget.value }) }} required /></label></> : <>
        {mode === 'create' && <label>Cliente<select disabled={saving} required value={draft.clienteId} onChange={event => { resetKey(); setDraft({ ...draft, clienteId: event.currentTarget.value }) }}><option value="">Selecciona un cliente</option>{clientes.map(client => <option key={client.id} value={client.id}>{nombreCliente(client)}</option>)}</select></label>}
        <label>Referencia<input disabled={saving} maxLength={100} required value={draft.referencia} onChange={event => { resetKey(); setDraft({ ...draft, referencia: event.currentTarget.value }) }} /></label>
        {mode === 'renew' && <p>La renovación pertenecerá a {detail?.clienteNombre} y debe iniciar al vencer el contrato actual.</p>}
        <label>Inicio<input disabled={saving} type="datetime-local" required value={draft.inicio} min={mode === 'renew' && detail ? managuaInput(detail.fin) : undefined} onChange={event => { resetKey(); setDraft({ ...draft, inicio: event.currentTarget.value }) }} /></label><label>Fin<input disabled={saving} type="datetime-local" required value={draft.fin} onChange={event => { resetKey(); setDraft({ ...draft, fin: event.currentTarget.value }) }} /></label><label>Importe (NIO)<input disabled={saving} inputMode="decimal" required value={draft.importe} onChange={event => { resetKey(); setDraft({ ...draft, importe: event.currentTarget.value }) }} placeholder="0.00" /></label><label>Observación (opcional)<textarea disabled={saving} maxLength={1000} value={draft.observacion} onChange={event => { resetKey(); setDraft({ ...draft, observacion: event.currentTarget.value }) }} /></label>
      </>}
      <div className="h5-dialog__actions"><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant="primary" onClick={() => void submit()} disabled={saving || !isFormValid}>{saving ? 'Guardando…' : mode === 'terminate' ? 'Terminar contrato' : mode === 'renew' ? 'Registrar renovación' : 'Guardar contrato'}</Button></div>
    </section>}
  </section>
}
