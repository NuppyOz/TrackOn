import { useEffect, useState } from 'react';
import { listarOrdenes } from '../ordenes/ordenes.api';
import type { OrdenResumen } from '../ordenes/ordenes.types';
import { Button, StatePanel, TablePagination } from '../../shared/ui';
import { connectRealtime } from '../../shared/realtime';
import { conectarGoogleCalendar, desconectarGoogleCalendar, estadoGoogleCalendar, sincronizarGoogleCalendar, type GoogleCalendarStatus } from './google-calendar.api';
import ConfirmDialog from '../../shared/ConfirmDialog';

function hoyManagua() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Managua', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export default function Agenda({ onOrden }: Readonly<{ onOrden: (id: number) => void }>) {
    const [dia, setDia] = useState(hoyManagua);
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<{ items: OrdenResumen[]; hayMas: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [google, setGoogle] = useState<GoogleCalendarStatus | null>(null);
    const [mensajeGoogle, setMensajeGoogle] = useState(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('google') === 'connected') return 'Tu cuenta de Google Calendar quedó conectada.';
        if (query.get('google') === 'error') return query.get('message') ?? 'No se pudo conectar Google Calendar.';
        return '';
    });
    const [procesandoGoogle, setProcesandoGoogle] = useState(false);
    const [confirmandoDesconexion, setConfirmandoDesconexion] = useState(false);
    useEffect(() => {
        let vigente = true;
        void listarOrdenes({ estado: '', buscar: '', pagina, limite: 25, desde: dia, hasta: dia })
            .then(datos => { if (vigente) { setDatos(datos); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar la agenda.'); });
        return () => { vigente = false; };
    }, [dia, pagina, recarga]);
    useEffect(() => {
        let vigente = true;
        void estadoGoogleCalendar().then(status => { if (vigente) setGoogle(status); }).catch(() => undefined);
        const query = new URLSearchParams(window.location.search);
        if (query.has('google')) window.history.replaceState({}, '', '/agenda');
        const disconnect = connectRealtime(event => {
            if (event.type === 'calendar.sync.completed') {
                const cantidad = Number(event.data?.sincronizadas ?? 0);
                setMensajeGoogle(`Sincronización terminada: ${cantidad} cita${cantidad === 1 ? '' : 's'}.`);
                setProcesandoGoogle(false);
            }
            if (event.type === 'calendar.sync.failed') {
                setMensajeGoogle(String(event.data?.message ?? 'La sincronización con Google falló.'));
                setProcesandoGoogle(false);
            }
        });
        return () => { vigente = false; disconnect(); };
    }, []);
    function seleccionarDia(valor: string) { if (!valor) return; setDia(valor); setPagina(1); setDatos(null); }
    function desplazar(delta: number) { seleccionarDia(new Date(new Date(`${dia}T12:00:00Z`).getTime() + delta * 86400000).toISOString().slice(0, 10)); }
    async function conectarGoogle() {
        setProcesandoGoogle(true); setMensajeGoogle('');
        try { const { url } = await conectarGoogleCalendar(); window.location.assign(url); }
        catch (error) { setMensajeGoogle(error instanceof Error ? error.message : 'No se pudo iniciar la conexión con Google.'); setProcesandoGoogle(false); }
    }
    async function desconectarGoogle() {
        setProcesandoGoogle(true);
        try { await desconectarGoogleCalendar(); setGoogle(actual => actual ? { ...actual, conectado: false } : actual); setMensajeGoogle('Cuenta de Google Calendar desconectada.'); }
        catch (error) { setMensajeGoogle(error instanceof Error ? error.message : 'No se pudo desconectar Google Calendar.'); }
        finally { setProcesandoGoogle(false); setConfirmandoDesconexion(false); }
    }
    async function sincronizarGoogle() {
        setProcesandoGoogle(true); setMensajeGoogle('Sincronización en segundo plano iniciada…');
        try { await sincronizarGoogleCalendar(dia); }
        catch (error) { setMensajeGoogle(error instanceof Error ? error.message : 'No se pudo iniciar la sincronización.'); setProcesandoGoogle(false); }
    }
    return <section className="tk-dashboard"><div className="section-heading"><div><h2>Agenda y planificación</h2><p>Consulta las visitas programadas y abre cada orden para gestionar su asignación.</p></div><Button onClick={() => setRecarga(valor => valor + 1)}>Actualizar</Button></div>
        <div className="card"><div className="section-heading"><div><h3>Google Calendar</h3><p>{google?.conectado ? 'Tu agenda está conectada. Puedes enviar o actualizar las citas del día seleccionado.' : 'Conecta tu cuenta personal para registrar las visitas en tu calendario principal.'}</p></div><div className="actions">{google?.conectado ? <><Button disabled={procesandoGoogle} onClick={() => void sincronizarGoogle()}>{procesandoGoogle ? 'Procesando…' : 'Sincronizar este día'}</Button><Button disabled={procesandoGoogle} onClick={() => setConfirmandoDesconexion(true)}>Desconectar</Button></> : <Button disabled={procesandoGoogle || google?.configurado === false} onClick={() => void conectarGoogle()}>Conectar Google Calendar</Button>}</div></div>
            {google?.configurado === false && <p className="notice warning">La integración requiere configurar las credenciales OAuth de Google en el servidor.</p>}
            {mensajeGoogle && <p role="status" className="notice">{mensajeGoogle}</p>}
        </div>
        <div className="filters"><Button onClick={() => desplazar(-1)}>Día anterior</Button><label>Día de atención<input type="date" value={dia} onChange={event => seleccionarDia(event.target.value)} /></label><Button onClick={() => seleccionarDia(hoyManagua())}>Hoy</Button><Button onClick={() => desplazar(1)}>Día siguiente</Button></div>
        {error && <StatePanel type="error" title={error} />}{!datos && !error && <StatePanel type="loading" title="Cargando agenda…" />}
        {datos && <div className="card tk-dashboard-list"><h3>{new Intl.DateTimeFormat('es-NI', { dateStyle: 'full', timeZone: 'America/Managua' }).format(new Date(`${dia}T12:00:00-06:00`))}</h3>
            <TablePagination pagina={pagina} hayMas={datos.hayMas} cantidad={datos.items.length} etiqueta="atenciones" onPagina={valor => { setDatos(null); setPagina(valor); }} />
            {datos.items.length === 0 && <StatePanel type="empty" title="No hay órdenes programadas para este día" />}
            {[...datos.items].sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? '')).map(item => <div className="tk-dashboard-row" key={item.id}><div><strong>{item.fechaProgramada && new Intl.DateTimeFormat('es-NI', { timeStyle: 'short', timeZone: 'America/Managua' }).format(new Date(item.fechaProgramada))} · OT-{item.numero}</strong><p>{item.clienteNombreRegistrado} · {item.ubicacionNombreRegistrado}</p><small>{item.asignaciones?.[0]?.cuadrilla?.nombre ?? 'Sin cuadrilla asignada'} · {item.estadoCodigo.replaceAll('_', ' ')}</small></div><Button onClick={() => onOrden(item.id)}>Gestionar orden</Button></div>)}
        </div>}
        {confirmandoDesconexion && <ConfirmDialog titulo="Desconectar Google Calendar"
            descripcion="Las citas ya creadas permanecerán en Google Calendar, pero TrackOn dejará de actualizarlas."
            etiquetaConfirmar="Sí, desconectar" variante="danger" procesando={procesandoGoogle}
            onCancel={() => setConfirmandoDesconexion(false)} onConfirm={() => void desconectarGoogle()} />}
    </section>;
}
