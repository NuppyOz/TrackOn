import { useEffect, useState } from 'react';
import { obtenerResumen, type ResumenOperativo } from './dashboard.api';
import { Button, ButtonGroup, DataTable, StatePanel } from '../../shared/ui';

export default function Dashboard({ onOrden, onCuadrillas }: Readonly<{ onOrden: (id?: number) => void; onCuadrillas: () => void }>) {
    const [datos, setDatos] = useState<ResumenOperativo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [cargando, setCargando] = useState(true);
    useEffect(() => {
        let vigente = true;
        void obtenerResumen().then(resumen => { if (vigente) { setDatos(resumen); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar el resumen.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [recarga]);
    function actualizar() { setCargando(true); setRecarga(valor => valor + 1); }
    return <section className="tk-dashboard" aria-labelledby="dashboard-titulo">
        <div className="section-heading"><div><h2 id="dashboard-titulo">Centro operativo</h2><p>Prioriza lo que requiere atención y entra directamente a la orden donde debes actuar.</p></div><ButtonGroup className="tk-heading-actions"><Button disabled={cargando} onClick={actualizar}>Actualizar</Button><Button variant="primary" onClick={() => onOrden()}>Ver órdenes</Button></ButtonGroup></div>
        {error && <StatePanel type="error" title={error} action={<Button onClick={actualizar}>Reintentar</Button>} />}
        {cargando && <StatePanel type="loading" title="Actualizando el centro operativo…" />}
        {datos && <DashboardContenido datos={datos} onOrden={onOrden} onCuadrillas={onCuadrillas} />}
    </section>;
}

function DashboardContenido({ datos, onOrden, onCuadrillas }: Readonly<{ datos: ResumenOperativo; onOrden: (id?: number) => void; onCuadrillas: () => void }>) {
    const tarjetas = [
        { titulo: 'Sin asignar', valor: datos.pendientes, detalle: 'Requieren cuadrilla y horario' },
        { titulo: 'En revisión', valor: datos.enRevision, detalle: 'Pendientes de aprobación' },
        { titulo: 'En ejecución', valor: datos.enProceso, detalle: `${datos.urgentes} órdenes urgentes abiertas` },
        { titulo: 'Cerradas hoy', valor: datos.cerradasHoy, detalle: `${datos.cerradas} cerradas en total` },
    ];
    const fecha = new Intl.DateTimeFormat('es-NI', { weekday: 'long', day: 'numeric', month: 'long', timeZone: datos.zonaHoraria }).format(new Date(`${datos.fecha}T12:00:00-06:00`));
    return <>
        <div className="tk-dashboard-context"><div><strong>{fecha}</strong><p>{datos.programadasHoy} atenciones programadas hoy · {datos.abiertas} órdenes abiertas</p></div>
            <div><small>Cobertura operativa</small><strong>{datos.cuadrillas.filter(item => item.ordenesActivas === 0).length} de {datos.cuadrillas.length} cuadrillas sin órdenes activas</strong></div></div>
        <div className="tk-dashboard-kpis">{tarjetas.map(item => <article key={item.titulo} className="tk-kpi"><h3>{item.titulo}</h3><strong>{item.valor}</strong><p>{item.detalle}</p></article>)}</div>
        <div className="tk-dashboard-body"><div>
            <section className="card tk-dashboard-list tk-attention"><div className="tk-attention__heading"><div><h3>Requieren atención</h3><p>Órdenes pendientes de asignación o revisión.</p></div>{datos.requierenAtencion.length > 0 && <span>{datos.requierenAtencion.length} órdenes</span>}</div>
                {datos.requierenAtencion.length === 0 && <StatePanel type="empty" title="Sin órdenes pendientes de atención" />}
                {datos.requierenAtencion.length > 0 && <DataTable className="tk-attention-table" label="Órdenes que requieren atención"><thead><tr><th data-align="center">OT</th><th>Cliente</th><th>Descripción</th><th data-align="center">Prioridad</th><th data-align="center">Estado</th><th data-align="actions"><span className="sr-only">Acción</span></th></tr></thead><tbody>
                    {datos.requierenAtencion.map(item => <tr key={item.id}><td data-label="OT" data-align="center"><strong className="tk-attention-ot">OT-{item.numero}</strong></td><td data-label="Cliente"><span className="tk-attention-client">{item.clienteNombreRegistrado}</span></td><td data-label="Descripción"><span className="tk-attention-description" title={item.solicitud}>{item.solicitud}</span></td><td data-label="Prioridad" data-align="center"><span className="tk-attention-badge tk-attention-priority" data-priority={item.prioridad}>{item.prioridad}</span></td><td data-label="Estado" data-align="center"><span className="tk-attention-badge tk-attention-status" data-status={item.estadoCodigo}>{item.estadoCodigo.replaceAll('_', ' ')}</span></td><td data-label="Acción" data-align="actions" className="tk-attention-action"><Button onClick={() => onOrden(item.id)}>{item.estadoCodigo === 'EN_REVISION' ? 'Revisar' : 'Asignar'}</Button></td></tr>)}
                </tbody></DataTable>}
            </section>
            <section className="card tk-dashboard-list"><h3>Próximas atenciones</h3>{datos.proximas.length === 0 && <p>No hay más atenciones programadas para hoy.</p>}
                {datos.proximas.map(item => <div className="tk-dashboard-row" key={item.id}><div><strong>{item.fechaProgramada && new Intl.DateTimeFormat('es-NI', { timeStyle: 'short', timeZone: datos.zonaHoraria }).format(new Date(item.fechaProgramada))} · {item.clienteNombreRegistrado}</strong><small>OT-{item.numero}</small></div><Button onClick={() => onOrden(item.id)}>Consultar</Button></div>)}
            </section>
        </div><aside><section className="card tk-dashboard-list"><h3>Carga de cuadrillas</h3>{datos.cuadrillas.length === 0 && <p>No hay cuadrillas activas.</p>}
            {datos.cuadrillas.map(item => <div className="tk-dashboard-row" key={item.id}><strong>{item.nombre}</strong><span>{item.ordenesActivas} órdenes</span></div>)}<Button onClick={onCuadrillas}>Ver cuadrillas</Button></section>
        </aside></div>
    </>;
}
