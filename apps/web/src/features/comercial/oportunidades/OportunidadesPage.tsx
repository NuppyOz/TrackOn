import { useEffect, useState } from 'react'
import { Paginacion } from '../../../shared/Paginacion'
import { listarClientes } from '../../clientes/clientes.api'
import { nombreCliente, type Cliente } from '../../clientes/clientes.types'
import { Button } from '../../../shared/ui'
import { ModuleHeader, DataTable, type DataTableColumn } from '../../erp-ui/components'
import { RUTAS } from '../../../shared/navigation'
import { actualizarOportunidad, crearOportunidad, listarOportunidades, type EtapaOportunidad, type Oportunidad } from './oportunidades.api'
import './oportunidades.css'

const etapas: EtapaOportunidad[] = ['NUEVA', 'CALIFICADA', 'PROPUESTA', 'GANADA', 'PERDIDA']
const etiquetas: Record<EtapaOportunidad, string> = { NUEVA: 'Nueva', CALIFICADA: 'Calificada', PROPUESTA: 'Cotización', GANADA: 'Ganada', PERDIDA: 'Perdida' }
const err = (cause: unknown) => cause instanceof Error ? cause.message : 'No se pudo completar la operación.'
const dinero = (v: string | null) => v === null ? 'Sin estimación' : `C$ ${Number(v).toLocaleString('es-NI', { minimumFractionDigits: 2 })}`

const migas = (actual: string) => [{ label: 'Comercial', ruta: RUTAS.comercial.inicio }, { label: 'Gestión de ventas', ruta: RUTAS.comercial.ventas }, { label: actual }]

export function OportunidadesPage({ clienteId, onCreateQuote }: Readonly<{ clienteId?: number; onCreateQuote: (item: Oportunidad) => void }>) {
  const [rows, setRows] = useState<Oportunidad[]>([]); const [clients, setClients] = useState<Cliente[]>([])
  const [q, setQ] = useState(''); const [page, setPage] = useState(1); const [more, setMore] = useState(false); const [total, setTotal] = useState<number>()
  const [view, setView] = useState<'pipeline' | 'lista'>('pipeline'); const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  const reload = async (target = page) => { setLoading(true); setError(''); try { const result = await listarOportunidades({ clienteId, q: q.trim() || undefined, pagina: target, limite: 10 }); setRows(result.items); setPage(result.pagina); setMore(result.hayMas); setTotal(result.total) } catch (e) { setError(err(e)) } finally { setLoading(false) } }
  useEffect(() => { let live = true; Promise.all([listarClientes(), listarOportunidades({ clienteId, pagina: 1, limite: 10 })]).then(([customer, result]) => { if (live) { setClients(customer); setRows(result.items); setMore(result.hayMas); setTotal(result.total) } }).catch(e => { if (live) setError(err(e)) }).finally(() => { if (live) setLoading(false) }); return () => { live = false } }, [clienteId])
  const columns: DataTableColumn<Oportunidad>[] = [
    { key: 'nombre', header: 'Oportunidad', render: x => x.nombre }, { key: 'cliente', header: 'Cliente', render: x => x.clienteNombre },
    { key: 'responsable', header: 'Responsable', render: x => x.responsableNombre }, { key: 'valor', header: 'Valor estimado', render: x => dinero(x.valorEstimado), align: 'end' },
    { key: 'etapa', header: 'Etapa', render: x => etiquetas[x.etapa] },
    { key: 'acciones', header: 'Acciones', render: x => <div className="opp__row-actions">{x.etapa !== 'GANADA' && x.etapa !== 'PERDIDA' && <select aria-label={`Etapa de ${x.nombre}`} value={x.etapa} disabled={busy} onChange={e => void changeStage(x, e.target.value as EtapaOportunidad)}>{['NUEVA','CALIFICADA','PROPUESTA','PERDIDA'].map(stage => <option key={stage} value={stage}>{etiquetas[stage as EtapaOportunidad]}</option>)}</select>}<Button disabled={busy || !x.clienteActivo || x.etapa === 'GANADA' || x.etapa === 'PERDIDA'} onClick={() => onCreateQuote(x)}>Crear cotización</Button></div> },
  ]
  const changeStage = async (item: Oportunidad, etapa: EtapaOportunidad) => { setBusy(true); setError(''); try { await actualizarOportunidad(item.id, { version: item.version, etapa: etapa as 'CALIFICADA'|'PROPUESTA'|'PERDIDA' }); setSuccess(`Etapa actualizada: ${etiquetas[etapa]}.`); await reload() } catch (e) { setError(err(e)); await reload() } finally { setBusy(false) } }
  const create = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const client = Number(data.get('clienteId')); const title = String(data.get('nombre') ?? '').trim(); const value = String(data.get('valorEstimado') ?? '').trim(); setBusy(true); setError(''); setSuccess(''); try { await crearOportunidad({ clienteId: client, nombre: title, ...(value ? { valorEstimado: value } : {}) }); setCreating(false); setPage(1); await reload(1); setSuccess('Oportunidad registrada.') } catch (e) { setError(err(e)) } finally { setBusy(false) } }
  return <section className="opp" aria-label="Oportunidades comerciales">
    <ModuleHeader breadcrumb={migas(creating ? 'Nueva oportunidad' : 'Oportunidades')} title={creating ? 'Nueva oportunidad' : 'Oportunidades'} description={creating ? undefined : 'Negocios en seguimiento hasta convertirlos en cotización.'} action={<Button variant="primary" disabled={busy} onClick={() => setCreating(value => !value)}>{creating ? 'Cancelar' : 'Nueva oportunidad'}</Button>} />
    {creating && <form className="opp__form" onSubmit={event => void create(event)}><label>Cliente<select name="clienteId" required defaultValue={clienteId ? String(clienteId) : ''}><option value="" disabled>Selecciona un cliente</option>{clients.filter(x => x.activo).map(x => <option key={x.id} value={x.id}>{nombreCliente(x)}</option>)}</select></label><label>Nombre de la oportunidad<input name="nombre" required maxLength={150} /></label><label>Valor estimado (opcional)<input name="valorEstimado" inputMode="decimal" pattern="(?:0|[1-9][0-9]{0,13})(?:\.[0-9]{1,2})?" /></label><Button variant="primary" type="submit" loading={busy}>Guardar oportunidad</Button></form>}
    {success && <p role="status" className="opp__notice tk-toast">{success}</p>}{error && <p role="alert" className="opp__error">{error}</p>}
    {!creating && <><div className="opp__switch" role="group" aria-label="Vista de oportunidades"><button type="button" aria-pressed={view === 'pipeline'} onClick={() => setView('pipeline')}>Pipeline</button><button type="button" aria-pressed={view === 'lista'} onClick={() => setView('lista')}>Lista</button></div>
    {view === 'lista' ? <DataTable columns={columns} rows={rows} getRowKey={x => x.id} search={{ value: q, onChange: v => { setQ(v); setPage(1); void reload(1) }, placeholder: 'Nombre u organización', label: 'Buscar' }} pagination={{ pagina: page, limite: 10, hayMas: more, total, onPageChange: v => void reload(v) }} state={loading ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void reload()} emptyTitle="No hay oportunidades" emptyDescription="Registra una oportunidad para iniciar el seguimiento." /> : <>
      {loading ? <p role="status">Cargando oportunidades…</p> : <div className="opp__board">{etapas.map(stage => <section className="opp__column" key={stage} aria-label={etiquetas[stage]}><h3>{etiquetas[stage]}</h3>{rows.filter(x => x.etapa === stage).map(item => <article className="opp__card" key={item.id}><strong>{item.nombre}</strong><span>{item.clienteNombre}</span><span>Responsable: {item.responsableNombre}</span><span>{dinero(item.valorEstimado)}</span>{item.proximaActividad && <time dateTime={item.proximaActividad}>Próxima actividad: {new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium' }).format(new Date(item.proximaActividad))}</time>}{item.cotizaciones.length > 0 && <span>{item.cotizaciones.length} cotización(es)</span>}{stage !== 'GANADA' && stage !== 'PERDIDA' && <div className="opp__card-actions"><select aria-label={`Mover ${item.nombre}`} value={stage} disabled={busy} onChange={e => void changeStage(item, e.target.value as EtapaOportunidad)}>{['NUEVA','CALIFICADA','PROPUESTA','PERDIDA'].map(next => <option key={next} value={next}>{etiquetas[next as EtapaOportunidad]}</option>)}</select><Button disabled={busy || !item.clienteActivo} onClick={() => onCreateQuote(item)}>Cotizar</Button></div>}</article>)}{rows.filter(x => x.etapa === stage).length === 0 && <p className="opp__empty">Sin oportunidades</p>}</section>)}</div>}
      <Paginacion pagina={page} limite={10} hayMas={more} total={total} cargando={loading} etiqueta="Paginación de oportunidades" onPagina={v => void reload(v)} />
    </>}
    </>}
  </section>
}
