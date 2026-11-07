import { useEffect, useState } from 'react';
import { listarOrdenes } from '../ordenes/ordenes.api';
import type { OrdenResumen } from '../ordenes/ordenes.types';
import { Button, StatePanel } from '../../shared/ui';
import './agenda.css';

const ZONA = 'America/Managua';
const fechaISO = (fecha: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
function hoyManagua() { return fechaISO(new Date()); }
const sumarDias = (iso: string, dias: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + dias * 86400000).toISOString().slice(0, 10);
/** Lunes de la semana a la que pertenece el día. */
function inicioSemana(iso: string) { return sumarDias(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7)); }
const hora = (fecha: string) => new Intl.DateTimeFormat('es-NI', { timeStyle: 'short', timeZone: ZONA }).format(new Date(fecha));

export default function Agenda({ onOrden, encabezado = true }: Readonly<{ onOrden: (id: number) => void; encabezado?: boolean }>) {
    const [lunes, setLunes] = useState(() => inicioSemana(hoyManagua()));
    const [datos, setDatos] = useState<{ items: OrdenResumen[]; hayMas: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const domingo = sumarDias(lunes, 6);
    const hoy = hoyManagua();

    useEffect(() => {
        let vigente = true;
        // shortcut: una semana cabe en el máximo de 100 registros por consulta; si hayMas se avisa, cuando crezca se pagina por día.
        void listarOrdenes({ estado: '', buscar: '', pagina: 1, limite: 100, desde: lunes, hasta: domingo })
            .then(datos => { if (vigente) { setDatos(datos); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar la agenda.'); });
        return () => { vigente = false; };
    }, [lunes, domingo, recarga]);

    function irA(iso: string) { if (!iso) return; setDatos(null); setLunes(inicioSemana(iso)); }
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const eventosDe = (dia: string) => (datos?.items ?? [])
        .filter(item => item.fechaProgramada && fechaISO(new Date(item.fechaProgramada)) === dia)
        .sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? ''));
    const sinFecha = (datos?.items ?? []).filter(item => !item.fechaProgramada);
    const mesAnio = new Intl.DateTimeFormat('es-NI', { month: 'long', year: 'numeric', timeZone: ZONA }).format(new Date(`${lunes}T12:00:00-06:00`));
    const titulo = mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1);

    return <section className="tk-dashboard agenda" aria-label="Agenda semanal">
        {encabezado && <div className="section-heading"><div><h2>Agenda</h2><p>Visitas programadas por semana. Haz clic en una visita para gestionar la orden.</p></div><Button onClick={() => setRecarga(valor => valor + 1)}>Actualizar</Button></div>}
        <div className="agenda__toolbar">
            <Button onClick={() => irA(hoy)}>Hoy</Button>
            <Button aria-label="Semana anterior" onClick={() => irA(sumarDias(lunes, -7))}>‹</Button>
            <Button aria-label="Semana siguiente" onClick={() => irA(sumarDias(lunes, 7))}>›</Button>
            <h3>{titulo}</h3>
            <label>Ir a la fecha<input type="date" value={lunes} onChange={event => irA(event.target.value)} /></label>
        </div>
        {error && <StatePanel type="error" title={error} />}
        {!datos && !error && <StatePanel type="loading" title="Cargando agenda…" />}
        {datos && <>
            <div className="agenda__grid" role="grid" aria-label={`Semana del ${lunes}`}>
                {dias.map(dia => {
                    const eventos = eventosDe(dia);
                    return <div key={dia} role="gridcell" className={`agenda__dia${dia === hoy ? ' is-hoy' : ''}`}>
                        <div className="agenda__dia-cabecera"><span>{new Intl.DateTimeFormat('es-NI', { weekday: 'short', timeZone: ZONA }).format(new Date(`${dia}T12:00:00-06:00`))}</span><strong>{Number(dia.slice(8))}</strong></div>
                        <div className="agenda__eventos">
                            {eventos.length === 0 && <p className="agenda__vacio">Sin visitas</p>}
                            {eventos.map(item => <button key={item.id} type="button" className={`agenda__evento agenda__evento--${item.estadoCodigo}`} aria-label={`Gestionar orden OT-${item.numero}`} onClick={() => onOrden(item.id)}>
                                <strong>{item.fechaProgramada && hora(item.fechaProgramada)} · OT-{item.numero}</strong>
                                <span>{item.clienteNombreRegistrado}</span>
                                <small>{item.asignaciones?.[0]?.cuadrilla?.nombre ?? 'Sin cuadrilla asignada'} · {item.estadoCodigo.replaceAll('_', ' ')}</small>
                            </button>)}
                        </div>
                    </div>;
                })}
            </div>
            {datos.items.length === 0 && <StatePanel type="empty" title="No hay órdenes programadas esta semana" />}
            {sinFecha.length > 0 && <p className="agenda__nota">{sinFecha.length} orden(es) de la semana sin hora programada.</p>}
            {datos.hayMas && <p className="agenda__nota">Hay más visitas de las que se muestran; acota la semana desde Órdenes.</p>}
        </>}
    </section>;
}
