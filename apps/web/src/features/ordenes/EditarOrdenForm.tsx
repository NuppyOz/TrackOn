import { useState, type SyntheticEvent } from 'react';
import { editarOrden } from './ordenes.api';
import type { OrdenDetalle, OrdenEdicion, OrdenResumen, PrioridadOrden } from './ordenes.types';

function fechaLocal(valor: string | null) {
    if (!valor) return '';
    const date = new Date(valor);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function EditarOrdenForm({ orden, onCancel, onSaved, onBusy }: Readonly<{
    orden: OrdenResumen; onCancel: () => void; onSaved: (orden: OrdenDetalle) => void; onBusy: (valor: boolean) => void;
}>) {
    const [solicitud, setSolicitud] = useState(orden.solicitud);
    const [prioridad, setPrioridad] = useState(orden.prioridad);
    const [fecha, setFecha] = useState(() => fechaLocal(orden.fechaProgramada));
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const datos: OrdenEdicion = {
        version: orden.version,
        ...(solicitud.trim() !== orden.solicitud ? { solicitud: solicitud.trim() } : {}),
        ...(prioridad !== orden.prioridad ? { prioridad } : {}),
        ...(fecha !== fechaLocal(orden.fechaProgramada) ? { fechaProgramada: fecha ? new Date(fecha).toISOString() : null } : {}),
    };
    const modificado = Object.keys(datos).length > 1;
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (guardando || !modificado) return;
        if (solicitud.trim().length < 5) { setError('Describe la solicitud con al menos cinco caracteres.'); return; }
        setGuardando(true); onBusy(true); setError('');
        try { onSaved(await editarOrden(orden.id, datos)); }
        catch (error) { setError(error instanceof Error ? error.message : 'No se pudo actualizar la orden.'); }
        finally { setGuardando(false); onBusy(false); }
    }
    return <form className="form-card tk-order-form" onSubmit={event => void guardar(event)}>
        <p className="tk-order-context">{orden.clienteNombreRegistrado} · {orden.ubicacionNombreRegistrado}</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <label>Solicitud<textarea aria-label="Solicitud" rows={4} required minLength={5} maxLength={5000} value={solicitud} onChange={event => setSolicitud(event.target.value)} /></label>
        <div className="tk-order-form-columns"><label>Prioridad<select aria-label="Prioridad" value={prioridad} onChange={event => setPrioridad(event.target.value as PrioridadOrden)}>{(['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map(valor => <option key={valor} value={valor}>{valor}</option>)}</select></label>
            <label>Programación<input type="datetime-local" aria-label="Programación" value={fecha} onChange={event => setFecha(event.target.value)} /></label></div>
        <div className="tk-form-actions"><button type="button" className="secondary-button" disabled={guardando} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button" disabled={guardando || !modificado}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>;
}
