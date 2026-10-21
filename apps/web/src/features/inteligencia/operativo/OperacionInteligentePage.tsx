import { useEffect, useMemo, useState } from 'react';
import { obtenerResumen, type ResumenOperativo } from '../../dashboard/dashboard.api';
import { listarOrdenes } from '../../ordenes/ordenes.api';
import type { EstadoOrden, OrdenResumen } from '../../ordenes/ordenes.types';
import { Button, StatePanel } from '../../../shared/ui';
import { irA } from '../../../shared/navigation';
import './operativo.css';

type Vista = 'resumen' | 'centro' | 'seguimiento' | 'indicadores';
const vistas: ReadonlyArray<{ id: Vista; nombre: string }> = [
    { id: 'resumen', nombre: 'Resumen ejecutivo' },
    { id: 'centro', nombre: 'Centro operativo' },
    { id: 'seguimiento', nombre: 'Seguimiento' },
    { id: 'indicadores', nombre: 'Indicadores' },
];
const estados: EstadoOrden[] = ['BORRADOR', 'PENDIENTE', 'ASIGNADA', 'EN_EJECUCION', 'EN_REVISION', 'CERRADA', 'CANCELADA'];
const nombreEstado = (estado: string) => estado.replaceAll('_', ' ').toLocaleLowerCase('es').replace(/^./, letra => letra.toUpperCase());
const fecha = (valor: string | null) => valor ? new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Managua' }).format(new Date(valor)) : 'Sin programar';

export default function OperacionInteligentePage({ ruta, onOrden }: Readonly<{ ruta: string; onOrden: (id: number) => void }>) {
    const segmento = ruta.split('/').filter(Boolean)[2];
    const vista = vistas.find(item => item.id === segmento)?.id ?? 'resumen';
    const [resumen, setResumen] = useState<ResumenOperativo | null>(null);
    const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);
    useEffect(() => {
        let vigente = true;
        void Promise.all([obtenerResumen(), listarOrdenes({ estado: '', buscar: '', pagina: 1, limite: 100 })])
            .then(([datos, pagina]) => { if (vigente) { setResumen(datos); setOrdenes(pagina.items); setError(''); } })
            .catch(fallo => { if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar la información operativa.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [recarga]);
    const programadas = useMemo(() => ordenes.filter(item => item.fechaProgramada && !['CERRADA', 'CANCELADA'].includes(item.estadoCodigo))
        .sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? '')), [ordenes]);
    function actualizar() { setCargando(true); setRecarga(valor => valor + 1); }
    return <section className="operativo-inteligente" aria-labelledby="operativo-titulo">
        <header className="operativo-heading"><div><p>IA y negocio</p><h1 id="operativo-titulo">Información operativa</h1>
            <span>Decisiones basadas en el estado real de las órdenes.</span></div><Button disabled={cargando} onClick={actualizar}>Actualizar</Button></header>
        <nav className="operativo-nav" aria-label="Vistas de información operativa">{vistas.map(item => <button key={item.id} type="button"
            aria-current={item.id === vista ? 'page' : undefined} onClick={() => irA(`/inteligencia/operacion/${item.id}`)}>{item.nombre}</button>)}</nav>
        {error && <StatePanel type="error" title={error} action={<Button onClick={actualizar}>Reintentar</Button>} />}
        {cargando && <StatePanel type="loading" title="Actualizando información operativa…" />}
        {!cargando && resumen && vista === 'resumen' && <Resumen datos={resumen} onOrden={onOrden} />}
        {!cargando && resumen && vista === 'centro' && <Listado titulo="Órdenes programadas" descripcion="Próximas atenciones con fecha definida." ordenes={programadas} onOrden={onOrden} />}
        {!cargando && resumen && vista === 'seguimiento' && <Listado titulo="Seguimiento de órdenes" descripcion="Estado actual de las órdenes más recientes." ordenes={ordenes} onOrden={onOrden} />}
        {!cargando && resumen && vista === 'indicadores' && <Indicadores datos={resumen} />}
    </section>;
}

function Resumen({ datos, onOrden }: Readonly<{ datos: ResumenOperativo; onOrden: (id: number) => void }>) {
    const metricas = [{ nombre: 'Órdenes activas', valor: datos.abiertas }, { nombre: 'Programadas hoy', valor: datos.programadasHoy },
        { nombre: 'Urgentes', valor: datos.urgentes }, { nombre: 'Cerradas hoy', valor: datos.cerradasHoy }];
    return <><div className="operativo-metricas">{metricas.map(item => <article key={item.nombre}><span>{item.nombre}</span><strong>{item.valor}</strong></article>)}</div>
        <Listado titulo="Requieren atención" descripcion="Prioridades para la gestión de hoy." ordenes={datos.requierenAtencion} onOrden={onOrden} /></>;
}

type OrdenVisible = Pick<OrdenResumen, 'id' | 'numero' | 'clienteNombreRegistrado' | 'estadoCodigo' | 'fechaProgramada'> & Partial<Pick<OrdenResumen, 'solicitud'>>;
function Listado({ titulo, descripcion, ordenes, onOrden }: Readonly<{ titulo: string; descripcion: string; ordenes: OrdenVisible[]; onOrden: (id: number) => void }>) {
    return <section className="operativo-panel"><div><h2>{titulo}</h2><p>{descripcion}</p></div>{ordenes.length === 0 ? <StatePanel type="empty" title="No hay órdenes para mostrar" /> : <div className="operativo-lista">{ordenes.map(item => <article key={item.id}>
        <div><span className="tk-status-badge" data-status={item.estadoCodigo}>{nombreEstado(item.estadoCodigo)}</span><strong>OT-{item.numero} · {item.clienteNombreRegistrado}</strong>{item.solicitud && <p>{item.solicitud}</p>}<small>{fecha(item.fechaProgramada)}</small></div>
        <Button onClick={() => onOrden(item.id)}>Abrir</Button></article>)}</div>}</section>;
}

function Indicadores({ datos }: Readonly<{ datos: ResumenOperativo }>) {
    const maximo = Math.max(1, ...estados.map(estado => datos.porEstado[estado] ?? 0));
    return <section className="operativo-panel"><div><h2>Órdenes por estado</h2><p>Distribución completa al momento de la consulta.</p></div><div className="operativo-barras">
        {estados.map(estado => { const valor = datos.porEstado[estado] ?? 0; return <div key={estado}><span>{nombreEstado(estado)}</span><div><i style={{ width: `${(valor / maximo) * 100}%` }} /></div><strong>{valor}</strong></div>; })}
    </div></section>;
}
