import { useState, type SyntheticEvent } from 'react';
import { cambiarEstadoOrden } from './ordenes.api';
import type { OrdenDetalle, OrdenResumen } from './ordenes.types';

export default function DesactivarOrdenForm({ orden, onCancel, onSaved, onBusy }: Readonly<{
    orden: OrdenResumen; onCancel: () => void; onSaved: (orden: OrdenDetalle) => void; onBusy: (valor: boolean) => void;
}>) {
    const [motivo, setMotivo] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (guardando || motivo.trim().length < 3) return;
        setGuardando(true); onBusy(true); setError('');
        try { onSaved(await cambiarEstadoOrden(orden.id, 'CANCELADA', motivo.trim())); }
        catch (error) { setError(error instanceof Error ? error.message : 'No se pudo desactivar la orden.'); }
        finally { setGuardando(false); onBusy(false); }
    }
    return <form className="form-card tk-order-form" onSubmit={event => void guardar(event)}>
        <p className="tk-order-context">{orden.clienteNombreRegistrado} · {orden.ubicacionNombreRegistrado}</p>
        <p className="tk-order-cancel-info">La orden quedará cancelada y la cuadrilla dejará de tenerla asignada. Se conservará el historial.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <label>Motivo de desactivación<textarea aria-label="Motivo de desactivación" required minLength={3} maxLength={1000} rows={3} value={motivo} onChange={event => setMotivo(event.target.value)} /></label>
        <div className="tk-form-actions"><button type="button" className="secondary-button" disabled={guardando} onClick={onCancel}>Cancelar</button><button type="submit" className="primary-button tk-order-cancel-button" disabled={guardando || motivo.trim().length < 3}>{guardando ? 'Desactivando…' : 'Desactivar orden'}</button></div>
    </form>;
}
