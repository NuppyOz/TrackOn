import { useEffect, useState } from 'react';
import { obtenerResumen, type ResumenOperativo } from './dashboard.api';
import { Button, StatePanel } from '../../shared/ui';

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
        <div className="section-heading"><div><h2 id="dashboard-titulo">Centro operativo</h2><p>Prioriza lo que requiere atención y entra directamente a la orden donde debes actuar.</p></div><Button disabled={cargando} onClick={actualizar}>Actualizar</Button></div>
        {error && <StatePanel type="error" title={error} action={<Button onClick={actualizar}>Reintentar</Button>} />}
        {cargando && <StatePanel type="loading" title="Actualizando el centro operativo…" />}
        {datos && <DashboardContenido datos={datos} onOrden={onOrden} onCuadrillas={onCuadrillas} />}
    </section>;
}

function DashboardContenido({ datos, onOrden, onCuadrillas }: Readonly<{ datos: ResumenOperativo; onOrden: (id?: number) => void; onCuadrillas: () => void }>) {
    const tarjetas = [
        { titulo: 'Sin asignar', valor: datos.pendientes, detalle: 'Requieren cuadrilla y horario', tono: 'warning' },
        { titulo: 'En revisión', valor: datos.enRevision, detalle: 'Pendientes de aprobación', tono: 'warning' },
        { titulo: 'En ejecución', valor: datos.enProceso, detalle: `${datos.urgentes} órdenes urgentes abiertas`, tono: 'info' },
        { titulo: 'Cerradas hoy', valor: datos.cerradasHoy, detalle: `${datos.cerradas} cerradas en total`, tono: 'success' },
    ];
    const fecha = new Intl.DateTimeFormat('es-NI', { weekday: 'long', day: 'numeric', month: 'long', timeZone: datos.zonaHoraria }).format(new Date(`${datos.fecha}T12:00:00-06:00`));
    return <>
        <div className="tk-dashboard-context"><div className="card"><strong>{fecha}</strong><p>{datos.programadasHoy} atenciones programadas hoy · {datos.abiertas} órdenes abiertas</p></div>
            <div className="card tk-dashboard-soft"><small>Cobertura operativa</small><strong>{datos.cuadrillas.filter(item => item.ordenesActivas === 0).length} de {datos.cuadrillas.length} cuadrillas sin órdenes activas</strong></div></div>
        <div className="tk-dashboard-kpis">{tarjetas.map(item => <article key={item.titulo} className={`card tk-kpi tk-kpi--${item.tono}`}><h3>{item.titulo}</h3><strong>{item.valor}</strong><p>{item.detalle}</p></article>)}</div>
        <div className="tk-dashboard-body"><div>
            <section className="card tk-dashboard-list"><h3>Requieren atención</h3><p>Órdenes pendientes de asignación o revisión.</p>
                {datos.requierenAtencion.length === 0 && <StatePanel type="empty" title="Sin órdenes pendientes de atención" />}
                {datos.requierenAtencion.map(item => <div className="tk-dashboard-row" key={item.id}><div><strong>OT-{item.numero} · {item.clienteNombreRegistrado}</strong><p>{item.solicitud}</p><small>{item.prioridad} · {item.estadoCodigo.replaceAll('_', ' ')}</small></div><Button onClick={() => onOrden(item.id)}>{item.estadoCodigo === 'EN_REVISION' ? 'Revisar' : 'Asignar'}</Button></div>)}
            </section>
            <section className="card tk-dashboard-list"><h3>Próximas atenciones</h3>{datos.proximas.length === 0 && <p>No hay más atenciones programadas para hoy.</p>}
                {datos.proximas.map(item => <div className="tk-dashboard-row" key={item.id}><div><strong>{item.fechaProgramada && new Intl.DateTimeFormat('es-NI', { timeStyle: 'short', timeZone: datos.zonaHoraria }).format(new Date(item.fechaProgramada))} · {item.clienteNombreRegistrado}</strong><small>OT-{item.numero}</small></div><Button onClick={() => onOrden(item.id)}>Consultar</Button></div>)}
            </section>
        </div><aside><section className="card tk-dashboard-list"><h3>Carga de cuadrillas</h3>{datos.cuadrillas.length === 0 && <p>No hay cuadrillas activas.</p>}
            {datos.cuadrillas.map(item => <div className="tk-dashboard-row" key={item.id}><strong>{item.nombre}</strong><span>{item.ordenesActivas} órdenes</span></div>)}<Button onClick={onCuadrillas}>Ver cuadrillas</Button></section>
            <section className="card tk-dashboard-list tk-dashboard-soft"><h3>Acciones frecuentes</h3><p>Consulta las órdenes para registrar una solicitud o dar seguimiento al trabajo.</p><Button variant="primary" onClick={() => onOrden()}>Ver órdenes</Button></section>
        </aside></div>
    </>;
}
