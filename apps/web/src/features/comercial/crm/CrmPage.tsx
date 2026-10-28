import { useEffect, useMemo, useState } from 'react';
import { listarClientes } from '../../../features/clientes/clientes.api';
import { nombreCliente, type Cliente } from '../../../features/clientes/clientes.types';
import { Button, StatePanel, StatusBadge } from '../../../shared/ui';
import { ModuleHeader } from '../../erp-ui/components';
import { NotasDocumentosPanel } from './NotasDocumentosPanel';
import { PerfilContactosPanel } from './PerfilContactosPanel';
import { HistorialComercialPanel } from './HistorialComercialPanel';
import './crm.css';

type Tab = 'resumen' | 'contactos' | 'notas' | 'documentos' | 'historial';
export function CrmPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState<Tab>('resumen');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let vigente = true;
    listarClientes().then(items => { if (vigente) { setClientes(items); setSeleccionado(actual => actual ?? items[0]?.id ?? null); setError(''); } }).catch(() => { if (vigente) setError('No se pudo cargar el catálogo de clientes.'); }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);
  const opciones = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return clientes.filter(c => !q || `${nombreCliente(c)} ${c.codigo}`.toLocaleLowerCase('es').includes(q));
  }, [clientes, busqueda]);
  const cliente = clientes.find(c => c.id === seleccionado) ?? null;
  return <div className="comercial-scope crm-page">
    <ModuleHeader breadcrumb={<>Comercial / Clientes</>} title="Clientes y CRM" description="Selecciona un cliente para consultar su información comercial complementaria." />
    {cargando ? <StatePanel type="loading" title="Cargando catálogo de clientes…" /> : error ? <StatePanel type="error" title={error} action={<Button onClick={() => { setCargando(true); setError(''); listarClientes().then(setClientes).catch(() => setError('No se pudo cargar el catálogo de clientes.')).finally(() => setCargando(false)); }}>Reintentar</Button>} /> : clientes.length === 0 ? <StatePanel type="empty" title="No hay clientes registrados" description="Los clientes se administran desde el módulo existente de Clientes." /> : <>
      <section className="crm-selector" aria-label="Selección de cliente">
        <label htmlFor="crm-busqueda">Buscar en el catálogo cargado</label>
        <input id="crm-busqueda" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre o código" />
        <label htmlFor="crm-cliente">Cliente</label>
        <select id="crm-cliente" value={seleccionado ?? ''} onChange={e => { setSeleccionado(e.target.value ? Number(e.target.value) : null); setTab('resumen'); }}>
          <option value="">Selecciona un cliente ({opciones.length} resultados)</option>
          {opciones.map(c => <option key={c.id} value={c.id}>{nombreCliente(c)} · {c.codigo}{c.activo ? '' : ' · Inactivo'}</option>)}
        </select>
        <p>El selector consulta el catálogo actual de Clientes; aquí se mantiene su ficha complementaria.</p>
      </section>
      {cliente && <section className="crm-detail" aria-label={`Ficha comercial de ${nombreCliente(cliente)}`}>
        <header className="crm-detail__header"><div><p className="crm-detail__code">{cliente.codigo}</p><h2>{nombreCliente(cliente)}</h2><p className="crm-detail__code">Identificación: {cliente.organizacion?.identificacionTributaria || cliente.persona?.numberDocument || 'No registrada'}</p></div><StatusBadge active={cliente.activo} /></header>
        <nav className="crm-tabs" aria-label="Información comercial">
          {([['resumen', 'Resumen'], ['contactos', 'Contactos'], ['notas', 'Notas'], ['documentos', 'Documentos'], ['historial', 'Historial comercial']] as const).map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        {tab === 'resumen' && <PerfilContactosPanel key={`${cliente.id}-perfil`} cliente={cliente} seccion="perfil" />}
        {tab === 'contactos' && <PerfilContactosPanel key={`${cliente.id}-contactos`} cliente={cliente} seccion="contactos" />}
        {tab === 'notas' && <NotasDocumentosPanel key={`${cliente.id}-notas`} clienteId={cliente.id} activo={cliente.activo} seccion="notas" />}
        {tab === 'documentos' && <NotasDocumentosPanel key={`${cliente.id}-docs`} clienteId={cliente.id} activo={cliente.activo} seccion="documentos" />}
        {tab === 'historial' && <HistorialComercialPanel key={`${cliente.id}-historial`} clienteId={cliente.id} />}
      </section>}
    </>}
  </div>;
}
