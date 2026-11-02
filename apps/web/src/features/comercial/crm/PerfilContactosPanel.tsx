import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api';
import { ActionMenu, Button, StatePanel, StatusBadge } from '../../../shared/ui';
import type { Cliente } from '../../clientes/clientes.types';
import { actualizarContacto, actualizarPerfil, crearContacto, listarContactos, obtenerPerfil, type ContactoComercial, type ContactoInput, type PerfilComercial } from './crm.api';
import { DataTable, type DataTableColumn, type SortDirection } from '../../erp-ui/components';

type Props = { cliente: Cliente; seccion?: 'perfil' | 'contactos' | 'ambos' };
const vacio = { nombre: '', email: '', telefono: '', cargo: '' };
const aPayload = (f: typeof vacio): ContactoInput => ({ nombre: f.nombre.trim(), email: f.email.trim() || null, telefono: f.telefono.trim() || null, cargo: f.cargo.trim() || null });

export function PerfilContactosPanel({ cliente, seccion = 'ambos' }: Props) {
  const [perfil, setPerfil] = useState<PerfilComercial | null>(null);
  const [contactos, setContactos] = useState<ContactoComercial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [errorContactos, setErrorContactos] = useState('');
  const [errorMutacion, setErrorMutacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [editPerfil, setEditPerfil] = useState(false);
  const [clasificacion, setClasificacion] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [contactoForm, setContactoForm] = useState<typeof vacio | null>(null);
  const [editando, setEditando] = useState<ContactoComercial | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ocupadoRef = useRef(false);
  const [consulta, setConsulta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'nombre' | 'creadoEn'>('nombre');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const requestRef = useRef(0);
  const perfilRequestRef = useRef(0);
  const soloLectura = !cliente.activo;

  const cargar = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const c = await listarContactos(cliente.id, { q: consulta.trim().slice(0, 100) || undefined, pagina, limite: 10, sortBy, sortDir });
      if (requestId !== requestRef.current) return;
      setContactos(c.items); setHayMas(c.hayMas); setErrorContactos('');
    } catch { if (requestId === requestRef.current) setErrorContactos('No se pudieron cargar los contactos.'); }
    finally { if (requestId === requestRef.current) setCargando(false); }
  }, [cliente.id, consulta, pagina, sortBy, sortDir]);
  const cargarPerfil = useCallback(async () => {
    const requestId = ++perfilRequestRef.current;
    try {
      const p = await obtenerPerfil(cliente.id);
      if (requestId !== perfilRequestRef.current) return;
      setPerfil(p); setClasificacion(p.clasificacion ?? ''); setInstrucciones(p.instruccionesFacturacion ?? ''); setErrorPerfil('');
    } catch { if (requestId === perfilRequestRef.current) setErrorPerfil('No se pudo cargar el perfil comercial.'); }
    finally { if (requestId === perfilRequestRef.current) setCargandoPerfil(false); }
  }, [cliente.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void cargar(); }, 0);
    return () => { window.clearTimeout(timer); requestRef.current += 1; };
  }, [cargar]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void cargarPerfil(); }, 0);
    return () => { window.clearTimeout(timer); perfilRequestRef.current += 1; };
  }, [cargarPerfil]);

  const guardarPerfil = async (e: FormEvent) => {
    e.preventDefault(); if (!perfil || errorPerfil || soloLectura || ocupadoRef.current) return;
    ocupadoRef.current = true; setOcupado(true); setErrorMutacion(''); setMensaje('');
    try {
      const p = await actualizarPerfil(cliente.id, { version: perfil.version, clasificacion: clasificacion.trim() || null, instruccionesFacturacion: instrucciones.trim() || null });
      setPerfil(p); setClasificacion(p.clasificacion ?? ''); setInstrucciones(p.instruccionesFacturacion ?? ''); setEditPerfil(false); setMensaje('Perfil guardado.');
    } catch (e) { setErrorMutacion(e instanceof ApiError && e.status === 409 ? 'El perfil cambió en otra sesión. Tus cambios siguen aquí; recarga para ver la versión actual.' : 'No se pudo guardar el perfil.'); }
    finally { ocupadoRef.current = false; setOcupado(false); }
  };
  const guardarContacto = async (e: FormEvent) => {
    e.preventDefault(); if (!contactoForm?.nombre.trim() || soloLectura || ocupadoRef.current) return;
    ocupadoRef.current = true; setOcupado(true); setErrorMutacion(''); setMensaje('');
    try {
      if (editando) await actualizarContacto(cliente.id, editando.id, { version: editando.version, ...aPayload(contactoForm) });
      else await crearContacto(cliente.id, aPayload(contactoForm));
      setContactoForm(null); setEditando(null); setMensaje('Contacto guardado.'); setCargando(true); await cargar();
    } catch (e) { setErrorMutacion(e instanceof ApiError && e.status === 409 ? 'El contacto cambió en otra sesión. Tus cambios siguen aquí; recarga para ver la versión actual.' : 'No se pudo guardar el contacto.'); }
    finally { ocupadoRef.current = false; setOcupado(false); }
  };
  const activar = async (c: ContactoComercial) => {
    if (soloLectura || ocupadoRef.current) return;
    ocupadoRef.current = true; setOcupado(true); setErrorMutacion(''); setMensaje('');
    try { await actualizarContacto(cliente.id, c.id, { version: c.version, activo: !c.activo }); setMensaje(c.activo ? 'Contacto desactivado.' : 'Contacto activado.'); setCargando(true); await cargar(); }
    catch (e) { setErrorMutacion(e instanceof ApiError && e.status === 409 ? 'El contacto cambió en otra sesión. Recarga los datos para continuar.' : 'No se pudo actualizar el contacto.'); }
    finally { ocupadoRef.current = false; setOcupado(false); }
  };
  const editar = (c: ContactoComercial) => { setEditando(c); setContactoForm({ nombre: c.nombre, email: c.email ?? '', telefono: c.telefono ?? '', cargo: c.cargo ?? '' }); };
  const columns: readonly DataTableColumn<ContactoComercial>[] = [
    { key: 'nombre', header: 'Nombre', sortable: true, render: c => c.nombre },
    { key: 'email', header: 'Correo', render: c => c.email || '—' },
    { key: 'telefono', header: 'Teléfono', render: c => c.telefono || '—' },
    { key: 'cargo', header: 'Cargo', render: c => c.cargo || '—' },
    { key: 'estado', header: 'Estado', render: c => <StatusBadge active={c.activo} /> },
    ...(!soloLectura ? [{ key: 'acciones', header: 'Acciones', render: (c: ContactoComercial) => <ActionMenu label={`Acciones para ${c.nombre}`}><button type="button" disabled={ocupado} onClick={() => editar(c)}>Editar</button><button type="button" disabled={ocupado} onClick={() => void activar(c)}>{c.activo ? 'Desactivar' : 'Activar'}</button></ActionMenu> }] : []),
  ];
  const reintentarConflicto = () => {
    setEditPerfil(false); setContactoForm(null); setEditando(null); setErrorMutacion(''); setCargando(true); setCargandoPerfil(true);
    void cargarPerfil(); void cargar();
  };

  if (cargandoPerfil && !perfil && seccion !== 'contactos') return <StatePanel type="loading" title="Cargando perfil comercial…" />;
  if (errorPerfil && !perfil && seccion !== 'contactos') return <StatePanel type="error" title={errorPerfil} action={<Button onClick={() => { setCargandoPerfil(true); void cargarPerfil(); }}>Reintentar perfil</Button>} />;
  return <div className="crm-panels">
    {(errorPerfil || errorContactos || errorMutacion) && <p className="crm-alert" role="alert">{errorMutacion || errorPerfil || errorContactos}</p>}
    {errorMutacion.includes('cambió en otra sesión') && <Button onClick={reintentarConflicto}>Descartar cambios y recargar</Button>}
    {mensaje && <p className="crm-success" role="status">{mensaje}</p>}
    {seccion !== 'contactos' && <section className="crm-card" aria-labelledby="crm-perfil-title">
      <div className="crm-card__heading"><div><h2 id="crm-perfil-title">Perfil comercial</h2><p>Información complementaria del cliente</p></div>{perfil && !errorPerfil && !soloLectura && !editPerfil && <Button onClick={() => setEditPerfil(true)}>Editar perfil</Button>}</div>
      {errorPerfil && <p className="crm-alert" role="alert">{errorPerfil} <Button onClick={() => { setCargandoPerfil(true); void cargarPerfil(); }}>Reintentar perfil</Button></p>}
      {editPerfil && !soloLectura && perfil ? <form className="crm-form" onSubmit={guardarPerfil}>
        <label>Clasificación<input value={clasificacion} onChange={e => setClasificacion(e.target.value)} maxLength={60} /></label>
        <label>Instrucciones de facturación<textarea value={instrucciones} onChange={e => setInstrucciones(e.target.value)} rows={3} maxLength={500} /></label>
        <div className="crm-form__actions"><Button type="button" onClick={() => { setEditPerfil(false); setClasificacion(perfil?.clasificacion ?? ''); setInstrucciones(perfil?.instruccionesFacturacion ?? ''); }}>Cancelar</Button><Button variant="primary" type="submit" loading={ocupado}>Guardar perfil</Button></div>
      </form> : <dl className="crm-profile"><div><dt>Clasificación</dt><dd>{perfil?.clasificacion || 'Sin clasificar'}</dd></div><div><dt>Instrucciones de facturación</dt><dd>{perfil?.instruccionesFacturacion || 'Sin instrucciones registradas'}</dd></div>{soloLectura && <p className="crm-muted">Cliente inactivo · solo lectura</p>}</dl>}
    </section>}
    {seccion !== 'perfil' && <section className="crm-card" aria-labelledby="crm-contactos-title">
      <div className="crm-card__heading"><div><h2 id="crm-contactos-title">Contactos</h2><p>{contactos.length} {contactos.length === 1 ? 'contacto' : 'contactos'}</p></div>{!soloLectura && !contactoForm && <Button variant="primary" onClick={() => { setEditando(null); setContactoForm(vacio); }}>Agregar contacto</Button>}</div>
      {contactoForm && !soloLectura && <form className="crm-form crm-contact-form" onSubmit={guardarContacto}>
        <h3>{editando ? 'Editar contacto' : 'Nuevo contacto'}</h3>
        <label>Nombre *<input required autoFocus value={contactoForm.nombre} onChange={e => setContactoForm({ ...contactoForm, nombre: e.target.value })} maxLength={150} /></label>
        <label>Correo<input type="email" value={contactoForm.email} onChange={e => setContactoForm({ ...contactoForm, email: e.target.value })} maxLength={254} /></label>
        <label>Teléfono<input value={contactoForm.telefono} onChange={e => setContactoForm({ ...contactoForm, telefono: e.target.value })} maxLength={25} /></label>
        <label>Cargo<input value={contactoForm.cargo} onChange={e => setContactoForm({ ...contactoForm, cargo: e.target.value })} maxLength={100} /></label>
        <div className="crm-form__actions"><Button type="button" onClick={() => { setContactoForm(null); setEditando(null); }}>Cancelar</Button><Button variant="primary" type="submit" loading={ocupado}>Guardar contacto</Button></div>
      </form>}
      <DataTable columns={columns} rows={contactos} getRowKey={c => c.id}
        search={{ value: consulta, onChange: value => { setConsulta(value.slice(0, 100)); setPagina(1); setCargando(true); }, label: 'Buscar contactos', placeholder: 'Nombre, correo o cargo' }}
        sort={{ key: sortBy, direction: sortDir, onChange: (key, dir) => { setSortBy(key as typeof sortBy); setSortDir(dir); setPagina(1); setCargando(true); } }}
        pagination={{ pagina, limite: 10, hayMas, onPageChange: next => { setPagina(next); setCargando(true); }, label: 'Paginación de contactos' }}
        state={cargando ? 'loading' : errorContactos ? 'error' : 'ready'} error={{ description: errorContactos }} onRetry={() => { setCargando(true); void cargar(); }}
        emptyTitle={consulta.trim() ? 'No hay resultados' : 'Aún no hay contactos'}
        emptyDescription={consulta.trim() ? 'Prueba con otro término de búsqueda.' : soloLectura ? 'Este cliente no tiene contactos registrados.' : 'Agrega un contacto para mantener sus referencias comerciales.'} />
    </section>}
  </div>;
}
