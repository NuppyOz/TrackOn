import { useEffect, useState } from 'react';
import { listarOrdenes } from '../ordenes/ordenes.api';
import type { OrdenResumen } from '../ordenes/ordenes.types';
import { Button, StatePanel } from '../../shared/ui';

function hoyManagua() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export default function Agenda({ onOrden }: Readonly<{ onOrden: (id: number) => void }>) {
    const [dia, setDia] = useState(hoyManagua);
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<{ items: OrdenResumen[]; hayMas: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    useEffect(() => {
        let vigente = true;
        void listarOrdenes({ estado: '', buscar: '', pagina, limite: 25, desde: dia, hasta: dia })
            .then(datos => { if (vigente) { setDatos(datos); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar la agenda.'); });
        return () => { vigente = false; };
    }, [dia, pagina, recarga]);
    function seleccionarDia(valor: string) { if (!valor) return; setDia(valor); setPagina(1); setDatos(null); }
    function desplazar(delta: number) { seleccionarDia(new Date(new Date(`${dia}T12:00:00Z`).getTime() + delta * 86400000).toISOString().slice(0, 10)); }
    return <section className="tk-dashboard"><div className="section-heading"><div><h2>Agenda y planificación</h2><p>Consulta las visitas programadas y abre cada orden para gestionar su asignación.</p></div><Button onClick={() => setRecarga(valor => valor + 1)}>Actualizar</Button></div>
        <div className="filters"><Button onClick={() => desplazar(-1)}>Día anterior</Button><label>Día de atención<input type="date" value={dia} onChange={event => seleccionarDia(event.target.value)} /></label><Button onClick={() => seleccionarDia(hoyManagua())}>Hoy</Button><Button onClick={() => desplazar(1)}>Día siguiente</Button></div>
        {error && <StatePanel type="error" title={error} />}{!datos && !error && <StatePanel type="loading" title="Cargando agenda…" />}
        {datos && <div className="card tk-dashboard-list"><h3>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'full', timeZone: 'America/Managua' }).format(new Date(`${dia}T12:00:00-06:00`))}</h3>
            {datos.items.length === 0 && <StatePanel type="empty" title="No hay órdenes programadas para este día" />}
            {[...datos.items].sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? '')).map(item => <div className="tk-dashboard-row" key={item.id}><div><strong>{item.fechaProgramada && new Intl.DateTimeFormat('es-NI', { timeStyle: 'short', timeZone: 'America/Managua' }).format(new Date(item.fechaProgramada))} · OT-{item.numero}</strong><p>{item.clienteNombreRegistrado} · {item.ubicacionNombreRegistrado}</p><small>{item.asignaciones?.[0]?.cuadrilla?.nombre ?? 'Sin cuadrilla asignada'} · {item.estadoCodigo.replaceAll('_', ' ')}</small></div><Button onClick={() => onOrden(item.id)}>Gestionar orden</Button></div>)}
            <div className="pagination"><Button disabled={pagina === 1} onClick={() => { setDatos(null); setPagina(valor => valor - 1); }}>Anterior</Button><span>Página {pagina}</span><Button disabled={!datos.hayMas} onClick={() => { setDatos(null); setPagina(valor => valor + 1); }}>Siguiente</Button></div>
        </div>}
    </section>;
}
