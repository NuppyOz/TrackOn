import { useEffect, useState, type FormEvent } from 'react';
import { actualizarCliente, cambiarEstadoCliente, listarClientesPagina, listarUbicacionesCliente, obtenerCliente, type ClienteActualizacion, type FiltrosClientes } from '../../../features/clientes/clientes.api';
import { RUTAS } from '../../../shared/navigation';
import ConfirmDialog from '../../../shared/ConfirmDialog';
import { Paginacion } from '../../../shared/Paginacion';
import type { Pagina } from '../../../shared/pagination';
import { useFiltrosListado } from '../../../shared/useFiltrosListado';
import type { UbicacionCliente } from '../../../features/clientes/clientes.types';
import { nombreCliente, type Cliente } from '../../../features/clientes/clientes.types';
import { Button, StatusBadge } from '../../../shared/ui';
import { NicaraguanPhoneField } from '../../../shared/ui/NicaraguanPhoneField';
import { AccionesFila, IconButton } from '../../../shared/ui';
import { CheckCircleIcon, EyeIcon, ProhibitIcon } from '@phosphor-icons/react';
import { DataTable, ModuleHeader, Tabs, type DataTableColumn } from '../../erp-ui/components';
import { NotasDocumentosPanel } from './NotasDocumentosPanel';
import { PerfilContactosPanel } from './PerfilContactosPanel';
import { HistorialComercialPanel } from './HistorialComercialPanel';
import { listarOportunidades, type Oportunidad } from '../oportunidades/oportunidades.api';
import './crm.css';

export type TabCrm = 'resumen' | 'contactos' | 'ubicaciones' | 'oportunidades' | 'notas' | 'documentos' | 'historial';
type Tab = TabCrm;
const tituloTab: Partial<Record<TabCrm, string>> = { contactos: 'Contactos de clientes', ubicaciones: 'Ubicaciones y sucursales' };
const descripcionTab: Partial<Record<TabCrm, string>> = { contactos: 'Selecciona un cliente para gestionar sus contactos.', ubicaciones: 'Selecciona un cliente para ver sus ubicaciones y sucursales.' };
const filtrosIniciales: FiltrosClientes = { buscar: '', tipo: '', estado: 'todos', pagina: 1, limite: 10 };
const identificacion = (c: Cliente) => c.organizacion?.identificacionTributaria || c.persona?.numberDocument || '—';
const telefono = (c: Cliente) => c.telefonoComercial || c.persona?.telephone || '—';
const correo = (c: Cliente) => c.correoComercial || c.persona?.correo || '—';
export function CrmPage({ tabInicial = 'resumen', clienteInicial = null }: Readonly<{ tabInicial?: TabCrm; clienteInicial?: number | null }>) {
  const [listado, setListado] = useState<Pagina<Cliente>>({ items: [], pagina: 1, limite: 10, hayMas: false }); const [seleccionado, setSeleccionado] = useState<number | null>(clienteInicial); const [externo, setExterno] = useState<Cliente | null>(null);
  const { filtros, aplicados, pendiente, cambiarFiltros, aplicarFiltros } = useFiltrosListado(filtrosIniciales); const [tab, setTab] = useState<Tab>(tabInicial);
  const [consultando, setCargando] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState(false);
  const cargando = consultando || pendiente;
  const clientes = listado.items; const setClientes = (actualizar: (items: Cliente[]) => Cliente[]) => setListado(actual => ({ ...actual, items: actualizar(actual.items) }));
  const cargar = (nuevos = aplicados) => { setCargando(true); setError(''); aplicarFiltros(nuevos) };
  const filtrar = (nuevos: FiltrosClientes, esperar = false) => { setCargando(true); setError(''); cambiarFiltros({ ...nuevos, pagina: 1 }, esperar) };
  useEffect(() => { let live = true; listarClientesPagina(aplicados).then(resultado => { if (live) setListado(resultado) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo de clientes.') }).finally(() => { if (live) setCargando(false) }); return () => { live = false } }, [aplicados]);
  const cliente = clientes.find(c => c.id === seleccionado) ?? (externo?.id === seleccionado ? externo : null);
  const modoSplit = Boolean(tituloTab[tabInicial]);
  // Enlace directo a /comercial/crm/:id cuando el cliente no está en la página cargada.
  useEffect(() => { if (seleccionado === null || cliente) return; let live = true; obtenerCliente(seleccionado).then(datos => { if (live) setExterno(datos) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'No se pudo cargar el cliente.') }); return () => { live = false } }, [seleccionado, cliente]);
  const [confirmacion, setConfirmacion] = useState<Cliente | null>(null);
  const desactivar = (row: Cliente) => setConfirmacion(row);
  const cambiarEstado = async (row: Cliente) => { const next = !row.activo; setConfirmacion(null); setBusy(true); setError(''); try { const updated = await cambiarEstadoCliente(row.id, next); setClientes(items => items.map(item => item.id === row.id ? updated : item)); setNotice(`Cliente ${next ? 'activado' : 'desactivado'}.`) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar el cliente.') } finally { setBusy(false) } };
  const columns: DataTableColumn<Cliente>[] = [
    { key: 'cliente', header: 'Cliente', render: c => <button className="crm-link" type="button" onClick={() => { setSeleccionado(c.id); setTab(tabInicial) }}>{nombreCliente(c)}</button> },
    { key: 'tipo', header: 'Tipo', render: c => c.organizacion ? 'Empresa' : 'Persona' },
    { key: 'telefono', header: 'Teléfono', render: telefono }, { key: 'correo', header: 'Correo', render: correo },
    { key: 'identificacion', header: 'Identificación fiscal', render: identificacion },
    { key: 'estado', header: 'Estado', render: c => <StatusBadge active={c.activo} /> },
    { key: 'acciones', header: 'Acciones', render: c => <AccionesFila><IconButton icon={EyeIcon} label="Ver ficha" onClick={() => { setSeleccionado(c.id); setTab(tabInicial) }} /><IconButton icon={c.activo ? ProhibitIcon : CheckCircleIcon} variant={c.activo ? 'danger' : 'secondary'} label={c.activo ? 'Desactivar' : 'Activar'} disabled={busy} onClick={() => void desactivar(c)} /></AccionesFila> },
  ];
  return <div className="comercial-scope crm-page">
    <ModuleHeader breadcrumb={[{ label: 'Comercial', ruta: RUTAS.comercial.inicio }, { label: 'CRM', ruta: RUTAS.comercial.crm }, ...(tituloTab[tabInicial] ? [{ label: tituloTab[tabInicial]! }] : [])]} title={tituloTab[tabInicial] ?? 'Gestión de clientes (CRM)'} description={descripcionTab[tabInicial] ?? 'Directorio de clientes y actividad comercial.'} action={<a className="crm-new-button" href={RUTAS.comercial['crm-nuevo']}>Nuevo cliente</a>} />
    {notice && <p role="status" className="crm-success tk-toast">{notice}</p>}{error && <p role="alert" className="crm-alert">{error}</p>}
    {modoSplit ? <div className="crm-split">
      <aside className="crm-split__lista" aria-label="Clientes">
        <label className="crm-split__buscar">Buscar cliente<input type="search" value={filtros.buscar} placeholder="Nombre, código o identificación" onChange={e => filtrar({ ...filtros, buscar: e.target.value }, true)} /></label>
        {cargando ? <p role="status" className="crm-muted">Cargando…</p> : clientes.length === 0 ? <p className="crm-muted">Sin clientes para esa búsqueda.</p> : <ul>
          {clientes.map(c => <li key={c.id}><button type="button" aria-pressed={c.id === seleccionado} onClick={() => { setSeleccionado(c.id); setTab(tabInicial) }}><strong>{nombreCliente(c)}</strong><small>{c.codigo} · {c.activo ? 'Activo' : 'Inactivo'}</small></button></li>)}
        </ul>}
        <Paginacion pagina={aplicados.pagina} limite={aplicados.limite} hayMas={listado.hayMas} total={listado.total} cargando={cargando} etiqueta="Paginación de clientes" onPagina={p => cargar({ ...aplicados, pagina: p })} />
      </aside>
      <section className="crm-split__panel" aria-live="polite">
        {!cliente ? <div className="crm-split__vacio"><strong>Selecciona un cliente</strong><p>{descripcionTab[tabInicial]}</p></div> : <>
          <header className="crm-split__cabecera"><div><p className="crm-detail__code">{cliente.codigo} · {identificacion(cliente)}</p><h2>{nombreCliente(cliente)}</h2></div><StatusBadge active={cliente.activo} /></header>
          {tab === 'contactos' && <PerfilContactosPanel key={`${cliente.id}-contactos`} cliente={cliente} seccion="contactos" />}
          {tab === 'ubicaciones' && <UbicacionesCliente key={`${cliente.id}-ubicaciones`} clienteId={cliente.id} />}
        </>}
      </section>
    </div> : <>
    {!cliente ? <><div className="crm-filters"><label>Tipo<select value={filtros.tipo} onChange={e => filtrar({ ...filtros, tipo: e.target.value })}><option value="">Todos</option><option value="EMPRESA">Empresa</option><option value="NATURAL">Persona</option></select></label><label>Estado<select value={filtros.estado} onChange={e => filtrar({ ...filtros, estado: e.target.value })}><option value="todos">Todos</option><option value="activos">Activo</option><option value="inactivos">Inactivo</option></select></label></div>
      <DataTable columns={columns} rows={clientes} getRowKey={c => c.id} search={{ value: filtros.buscar, onChange: v => filtrar({ ...filtros, buscar: v }, true), label: 'Buscar clientes', placeholder: 'Nombre, código, correo o identificación' }} pagination={{ pagina: aplicados.pagina, limite: aplicados.limite, hayMas: listado.hayMas, total: listado.total, onPageChange: p => cargar({ ...aplicados, pagina: p }), onLimitChange: l => cargar({ ...aplicados, limite: l, pagina: 1 }) }} state={cargando ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => cargar()} emptyTitle="No hay clientes" emptyDescription="Registra clientes para empezar a gestionar sus relaciones comerciales." />
    </> : <section className="crm-detail" aria-label={`Ficha comercial de ${nombreCliente(cliente)}`}>
      <header className="crm-detail__header"><div><p className="crm-detail__code">{cliente.codigo}</p><h2>{nombreCliente(cliente)}</h2><p className="crm-detail__code">Identificación: {identificacion(cliente)}</p></div><div className="crm-detail__actions"><StatusBadge active={cliente.activo} />{editando ? <Button disabled={busy} onClick={() => setEditando(false)}>Ver ficha</Button> : <Button disabled={busy || !cliente.activo} onClick={() => setEditando(true)}>Editar</Button>}<Button onClick={() => { setEditando(false); setSeleccionado(null) }}>Volver a clientes</Button></div></header>
      {editando ? <EditarCliente cliente={cliente} busy={busy} onCancel={() => setEditando(false)} onSave={async datos => { setBusy(true); setError(''); try { const updated = await actualizarCliente(cliente.id, datos); setClientes(all => all.map(item => item.id === updated.id ? updated : item)); setEditando(false); setNotice('Cliente actualizado.') } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el cliente.') } finally { setBusy(false) } }} /> : <>
      <Tabs label="Ficha del cliente" value={tab} onChange={value => setTab(value as Tab)} options={[{ value: 'resumen', label: 'General' }, { value: 'contactos', label: 'Contactos' }, { value: 'ubicaciones', label: 'Ubicaciones' }, { value: 'oportunidades', label: 'Oportunidades' }, { value: 'notas', label: 'Notas' }, { value: 'documentos', label: 'Documentos' }, { value: 'historial', label: 'Actividad comercial' }]} />
      {tab === 'resumen' && <PerfilContactosPanel key={`${cliente.id}-perfil`} cliente={cliente} seccion="perfil" />}
      {tab === 'contactos' && <PerfilContactosPanel key={`${cliente.id}-contactos`} cliente={cliente} seccion="contactos" />}
      {tab === 'ubicaciones' && <UbicacionesCliente key={`${cliente.id}-ubicaciones`} clienteId={cliente.id} />}
      {tab === 'oportunidades' && <OportunidadesCliente key={`${cliente.id}-oportunidades`} clienteId={cliente.id} />}
      {tab === 'notas' && <NotasDocumentosPanel key={`${cliente.id}-notas`} clienteId={cliente.id} activo={cliente.activo} seccion="notas" />}
      {tab === 'documentos' && <NotasDocumentosPanel key={`${cliente.id}-docs`} clienteId={cliente.id} activo={cliente.activo} seccion="documentos" />}
      {tab === 'historial' && <HistorialComercialPanel key={`${cliente.id}-historial`} clienteId={cliente.id} />}
      </>}
    </section>}
    </>}
    {confirmacion && <ConfirmDialog titulo={`¿${confirmacion.activo ? 'Desactivar' : 'Activar'} a ${nombreCliente(confirmacion)}?`} descripcion={confirmacion.activo ? 'El cliente dejará de aparecer en los selectores comerciales; su historial se conserva.' : 'El cliente volverá a estar disponible para cotizar y vender.'} etiquetaConfirmar={confirmacion.activo ? 'Desactivar' : 'Activar'} variante={confirmacion.activo ? 'danger' : 'primary'} procesando={busy} onCancel={() => setConfirmacion(null)} onConfirm={() => void cambiarEstado(confirmacion)} />}
  </div>;
}

function OportunidadesCliente({ clienteId }: Readonly<{ clienteId: number }>) {
  const [items, setItems] = useState<Oportunidad[]>([]); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let live = true; listarOportunidades({ clienteId, pagina: 1, limite: 10 }).then(result => { if (live) setItems(result.items) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'No se pudieron cargar las oportunidades.') }).finally(() => { if (live) setBusy(false) }); return () => { live = false } }, [clienteId]);
  const stage = (value: Oportunidad['etapa']) => ({ NUEVA: 'Nueva', CALIFICADA: 'Calificada', PROPUESTA: 'Con cotización', GANADA: 'Ganada', PERDIDA: 'Perdida' })[value];
  return <section className="crm-card" aria-label="Oportunidades del cliente"><div className="crm-card__heading"><div><h2>Oportunidades</h2><p>Negocios vinculados a este cliente.</p></div><a href="/comercial/cotizaciones-ventas">Abrir pipeline</a></div>{busy ? <p role="status">Cargando oportunidades…</p> : error ? <p role="alert" className="crm-alert">{error}</p> : items.length === 0 ? <p className="crm-muted">No hay oportunidades registradas para este cliente.</p> : <ul className="crm-opportunities">{items.map(item => <li key={item.id}><div><strong>{item.nombre}</strong><span>{stage(item.etapa)} · Responsable: {item.responsableNombre}</span></div><span>{item.cotizaciones.length} cotización(es)</span></li>)}</ul>}</section>;
}

function EditarCliente({ cliente, busy, onCancel, onSave }: Readonly<{ cliente: Cliente; busy: boolean; onCancel: () => void; onSave: (datos: ClienteActualizacion) => Promise<void> }>) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const value = (key: string) => String(data.get(key) ?? '').trim() || null;
    const datos: ClienteActualizacion = {
      telefonoComercial: phoneValue(data.get('telefonoComercial')), correoComercial: value('correoComercial'),
      ...(cliente.organizacion ? { organizacion: { razonSocial: value('razonSocial') ?? '', nombreComercial: value('nombreComercial'), identificacionTributaria: value('identificacionTributaria') ?? '' } } : { persona: { firstName: value('firstName') ?? '', secondName: value('secondName'), firstLastName: value('firstLastName') ?? '', secondLastName: value('secondLastName'), telephone: phoneValue(data.get('telephone')), correo: value('correo') } }),
    };
    await onSave(datos);
  };
  return <section className="crm-card crm-edit" aria-label="Editar cliente"><h2>Editar cliente</h2><p>Los cambios se guardan en el registro existente.</p><form className="crm-form" onSubmit={event => void submit(event)}>
    {cliente.organizacion ? <><label>Razón social<input name="razonSocial" required defaultValue={cliente.organizacion.razonSocial} maxLength={200} /></label><label>Nombre comercial<input name="nombreComercial" defaultValue={cliente.organizacion.nombreComercial ?? ''} maxLength={200} /></label><label>RUC<input name="identificacionTributaria" required defaultValue={cliente.organizacion.identificacionTributaria ?? ''} pattern="J[0-9]{13}" /></label></> : <><label>Primer nombre<input name="firstName" required defaultValue={cliente.persona?.firstName ?? ''} maxLength={100} /></label><label>Segundo nombre<input name="secondName" defaultValue={cliente.persona?.secondName ?? ''} maxLength={100} /></label><label>Primer apellido<input name="firstLastName" required defaultValue={cliente.persona?.firstLastName ?? ''} maxLength={100} /></label><label>Segundo apellido<input name="secondLastName" defaultValue={cliente.persona?.secondLastName ?? ''} maxLength={100} /></label><NicaraguanPhoneField id="crm-telefono-personal" name="telephone" label="Teléfono personal" defaultValue={cliente.persona?.telephone ?? ''} /><label>Correo personal<input name="correo" type="email" defaultValue={cliente.persona?.correo ?? ''} maxLength={254} /></label></>}
    <NicaraguanPhoneField id="crm-telefono-comercial" name="telefonoComercial" label="Teléfono comercial" defaultValue={cliente.telefonoComercial ?? ''} /><label>Correo comercial<input name="correoComercial" type="email" defaultValue={cliente.correoComercial ?? ''} maxLength={254} /></label><div className="crm-form__actions"><Button type="button" disabled={busy} onClick={onCancel}>Cancelar</Button><Button type="submit" variant="primary" loading={busy}>Guardar cambios</Button></div>
  </form></section>;
}

function phoneValue(value: FormDataEntryValue | null): string | null {
  const digits = String(value ?? '').trim();
  return digits ? `+505${digits}` : null;
}

function UbicacionesCliente({ clienteId }: Readonly<{ clienteId: number }>) {
  const [pagina, setPagina] = useState<Pagina<UbicacionCliente>>({ items: [], pagina: 1, limite: 10, hayMas: false }); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = async (requested = 1) => { setBusy(true); setError(''); try { setPagina(await listarUbicacionesCliente(clienteId, requested)) } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las ubicaciones.') } finally { setBusy(false) } };
  useEffect(() => { let live = true; listarUbicacionesCliente(clienteId).then(result => { if (live) setPagina(result) }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'No se pudieron cargar las ubicaciones.') }).finally(() => { if (live) setBusy(false) }); return () => { live = false } }, [clienteId]);
  const columnas: DataTableColumn<UbicacionCliente>[] = [
    { key: 'nombre', header: 'Sucursal / ubicación', render: u => <strong>{u.nombre}</strong> },
    { key: 'direccion', header: 'Dirección', render: u => u.direccion },
    { key: 'referencia', header: 'Referencia', render: u => u.referencia || '—' },
    { key: 'contacto', header: 'Contacto en sitio', render: u => u.contactoNombre ? <>{u.contactoNombre}{u.contactoTelefono && <small> · {u.contactoTelefono}</small>}</> : '—' },
    { key: 'estado', header: 'Estado', render: u => <StatusBadge active={u.activa} label={u.activa ? 'Activa' : 'Inactiva'} /> },
  ];
  return <section className="crm-card" aria-label="Ubicaciones del cliente"><div className="crm-card__heading"><div><h2>Ubicaciones y sucursales</h2><p>{pagina.total ?? pagina.items.length} {(pagina.total ?? pagina.items.length) === 1 ? 'registrada' : 'registradas'}</p></div></div>
    <DataTable columns={columnas} rows={pagina.items} getRowKey={u => u.id} pagination={{ pagina: pagina.pagina, limite: pagina.limite, hayMas: pagina.hayMas, total: pagina.total, onPageChange: p => void load(p), label: 'Paginación de ubicaciones' }} state={busy ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => void load(pagina.pagina)} emptyTitle="Este cliente no tiene ubicaciones registradas" emptyDescription="Registra sucursales desde el módulo de clientes." /></section>;
}
