import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { DataTable, type DataTableColumn } from '../erp-ui/components';
import { irA, RUTAS } from '../../shared/navigation';
import { descargarReporte, generarReporte, listarReportes, type Reporte, type TipoReporte } from './insights.api';
import { EyeIcon } from '@phosphor-icons/react';
import ConfirmDialog from '../../shared/ConfirmDialog';
import './insights.css';

const tipos: Record<TipoReporte, string> = {
  CLIENTES: 'Clientes', OPORTUNIDADES: 'Oportunidades', COTIZACIONES: 'Cotizaciones', VENTAS: 'Ventas confirmadas',
  ORDENES: 'Órdenes de trabajo', ASIGNACIONES: 'Asignaciones', EVIDENCIAS: 'Evidencias', CAMBIOS_ESTADO: 'Historial de estados',
};
const gruposReportes: { nombre: string; tipos: TipoReporte[] }[] = [
  { nombre: 'Comercial', tipos: ['CLIENTES', 'OPORTUNIDADES', 'COTIZACIONES', 'VENTAS'] },
  { nombre: 'Servicio y operaciones', tipos: ['ORDENES', 'ASIGNACIONES', 'EVIDENCIAS', 'CAMBIOS_ESTADO'] },
];
const descripciones: Record<TipoReporte, string> = {
  CLIENTES: 'Directorio de clientes registrados, con tipo, contacto y estado.',
  OPORTUNIDADES: 'Oportunidades con cliente, etapa, responsable y valor estimado registrado.',
  VENTAS: 'Ventas comerciales confirmadas y su cotización de origen.',
  ORDENES: 'Órdenes de trabajo con cliente, solicitud, estado y fechas.',
  COTIZACIONES: 'Cotizaciones registradas, importes y vigencia.',
  ASIGNACIONES: 'Asignaciones de órdenes a empleados o cuadrillas, con inicio y fin.',
  EVIDENCIAS: 'Archivos asociados a órdenes y estado de carga, sin exponer la clave privada.',
  CAMBIOS_ESTADO: 'Transiciones registradas en el historial de cada orden.',
};
const dashboards = [
  { title: 'Tablero ejecutivo', description: 'Visión gerencial de la operación.', route: RUTAS.inteligencia.operacion.resumen },
  { title: 'Centro operativo', description: 'Servicios que requieren seguimiento.', route: RUTAS.inteligencia.operacion.centro },
  { title: 'Indicadores operativos', description: 'Estado y desempeño de las órdenes.', route: RUTAS.inteligencia.operacion.indicadores },
  { title: 'Indicadores comerciales', description: 'Clientes, cotizaciones y ventas.', route: RUTAS.inteligencia.comercial },
  { title: 'Indicadores financieros', description: 'Facturación y cobros registrados.', route: RUTAS.inteligencia.financiero },
  { title: 'Indicadores logísticos', description: 'Inventario y movimientos registrados.', route: RUTAS.inteligencia.logistico },
  { title: 'Calidad y RRHH', description: 'Casos y registros de calidad.', route: RUTAS.inteligencia.calidad },
];

export default function InsightsPage({ ruta }: Readonly<{ ruta: string }>) {
  const vista = ruta.endsWith('/reportes') ? 'reportes' : ruta.endsWith('/historial') ? 'historial' : 'inicio';
  return <section className="insights-scope" aria-labelledby="insights-title">
    <header className="insights-header"><div><p>Inicio › Análisis</p><h1 id="insights-title">{vista === 'reportes' ? 'Generar reporte' : vista === 'historial' ? 'Historial de reportes' : 'Dashboard'}</h1></div></header>
    {vista === 'inicio' && <DashboardCatalog />}
    {vista === 'reportes' && <GenerarReporte />}
    {vista === 'historial' && <HistorialReportes />}
  </section>;
}
function navigate(event: MouseEvent<HTMLAnchorElement>) { event.preventDefault(); irA(event.currentTarget.pathname); }

function DashboardCatalog() {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const visibles = dashboards.filter(item => `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es')));
  const cols: DataTableColumn<(typeof dashboards)[number]>[] = [
    { key: 'nombre', header: 'Dashboard', render: item => <strong>{item.title}</strong> },
    { key: 'descripcion', header: 'Descripción', render: item => item.description },
    { key: 'accion', header: 'Acciones', align: 'center', render: item => <a className="insights-icon-action" href={item.route} onClick={navigate} aria-label={`Ver ${item.title}`} title={`Ver ${item.title}`}><EyeIcon size={20} weight="regular" aria-hidden="true" /></a> },
  ];
  return <div className="insights-surface"><p className="insights-surface-intro">Selecciona un dashboard para consultar los indicadores disponibles.</p>
    <DataTable columns={cols} rows={visibles.slice((pagina - 1) * 10, pagina * 10)} getRowKey={item => item.route}
      search={{ value: busqueda, onChange: value => { setBusqueda(value); setPagina(1); }, label: 'Buscar dashboard', placeholder: 'Nombre o descripción' }}
      pagination={{ pagina, limite: 10, hayMas: pagina * 10 < visibles.length, onPageChange: setPagina }}
      emptyTitle="No hay dashboards coincidentes" emptyDescription="Prueba con otra búsqueda." /></div>;
}

function GenerarReporte() {
  const [tipo, setTipo] = useState<TipoReporte>('ORDENES');
  const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [confirmando, setConfirmando] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (desde && hasta && desde > hasta) { setError('La fecha inicial debe ser anterior a la final.'); return; }
    setConfirmando(true);
  };
  const generar = async () => {
    setConfirmando(false);
    setBusy(true);
    try { await generarReporte({ tipo, ...(desde ? { desde: new Date(desde).toISOString() } : {}), ...(hasta ? { hasta: new Date(hasta).toISOString() } : {}) }); irA('/insights/historial'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar el reporte.'); }
    finally { setBusy(false); }
  };
  return <><form className="insights-form" onSubmit={submit}>
    <div className="insights-form-grid"><label>Contenido del reporte<select value={tipo} onChange={e => { setTipo(e.target.value as TipoReporte); setError(''); }}>{gruposReportes.map(grupo => <optgroup key={grupo.nombre} label={grupo.nombre}>{grupo.tipos.map(key => <option key={key} value={key}>{tipos[key]}</option>)}</optgroup>)}</select></label>
      <label>Desde<input type="datetime-local" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta<input type="datetime-local" value={hasta} onChange={e => setHasta(e.target.value)} /></label></div>
    <p className="insights-report-description">{descripciones[tipo]}</p>
    {error && <p role="alert" className="insights-error">{error}</p>}
    <div className="insights-form-actions"><button type="submit" disabled={busy}>{busy ? 'Generando…' : 'Exportar reporte (.csv)'}</button><a href="/insights/historial" onClick={navigate}>Ver historial de reportes</a></div>
  </form>
  {confirmando && <ConfirmDialog titulo="Confirmar exportación" descripcion={`¿Generar el reporte de ${tipos[tipo]} con los filtros seleccionados?`} etiquetaConfirmar="Exportar" procesando={busy} onCancel={() => setConfirmando(false)} onConfirm={() => void generar()} />}</>;
}

function HistorialReportes() {
  const [pagina, setPagina] = useState(1); const [items, setItems] = useState<Reporte[]>([]); const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => { let active = true; listarReportes(pagina).then(data => { if (active) { setItems(data.items); setTotal(data.total); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [pagina, version]);
  const download = async (r: Reporte) => { try { const blob = await descargarReporte(r.id); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `multicore-${r.tipo.toLowerCase()}-${r.id}.csv`; anchor.click(); URL.revokeObjectURL(url); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo descargar el reporte.'); } };
  const cols: DataTableColumn<Reporte>[] = [
    { key: 'archivo', header: 'Archivo', render: r => <><strong>multicore-{r.tipo.toLowerCase()}-{r.id}.csv</strong><small className="insights-file-range">{r.desde || r.hasta ? `${r.desde ? new Date(r.desde).toLocaleDateString('es-NI') : 'Inicio'} – ${r.hasta ? new Date(r.hasta).toLocaleDateString('es-NI') : 'Hoy'}` : 'Todos los registros'}</small></> },
    { key: 'tipo', header: 'Reporte', render: r => tipos[r.tipo] },
    { key: 'fecha', header: 'Solicitado', render: r => new Date(r.creadoEn).toLocaleString('es-NI') },
    { key: 'estado', header: 'Estado', render: () => <span className="insights-ready">Disponible</span> },
    { key: 'filas', header: 'Filas', align: 'end', render: r => r.filas },
    { key: 'descargar', header: 'Descargar', align: 'end', render: r => <button type="button" onClick={() => void download(r)}>Descargar CSV</button> },
  ];
  return <div className="insights-surface"><div className="insights-history-actions"><a href="/insights/reportes" onClick={navigate}>← Volver a reportes</a><span>{total} reportes</span><button type="button" onClick={() => { setBusy(true); setVersion(v => v + 1); }}>Actualizar</button></div>
    <DataTable columns={cols} rows={items} getRowKey={r => r.id} pagination={{ pagina, limite: 10, hayMas: pagina * 10 < total, onPageChange: next => { setBusy(true); setPagina(next); } }} state={busy ? 'loading' : error ? 'error' : 'ready'} error={{ title: error }} onRetry={() => { setBusy(true); setVersion(v => v + 1); }} emptyTitle="Aún no hay reportes" emptyDescription="Genera un reporte para verlo aquí." /></div>;
}
