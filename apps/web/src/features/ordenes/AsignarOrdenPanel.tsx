import { useEffect, useState, type SyntheticEvent } from 'react';
import { listarCuadrillas } from '../cuadrillas/cuadrillas.api';
import type { Cuadrilla } from '../cuadrillas/cuadrillas.types';
import { asignarOrden } from './ordenes.api';
import type { OrdenDetalle } from './ordenes.types';

interface Props {
    orden: OrdenDetalle;
    onCancel: () => void;
    onAssigned: (orden: OrdenDetalle) => void;
}

function liderHabilitado(cuadrilla: Cuadrilla) {
    return cuadrilla.miembros.find(miembro =>
        miembro.fin === null && miembro.esLider && miembro.empleado.active && miembro.empleado.habilitadoComoTecnico,
    );
}

function nombreLider(cuadrilla: Cuadrilla) {
    const lider = liderHabilitado(cuadrilla);
    return lider ? `${lider.empleado.persona.firstName} ${lider.empleado.persona.firstLastName}` : 'Sin líder habilitado';
}

export default function AsignarOrdenPanel({ orden, onCancel, onAssigned }: Readonly<Props>) {
    const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
    const [cuadrillaId, setCuadrillaId] = useState('');
    const [motivo, setMotivo] = useState('Asignación inicial de la orden.');
    const [fecha, setFecha] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let vigente = true;
        listarCuadrillas({ estado: 'activas', nombre: '' })
            .then(resultado => { if (vigente) setCuadrillas(resultado.items); })
            .catch((fallo: unknown) => { if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las cuadrillas.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, []);

    const disponibles = cuadrillas.filter(cuadrilla => cuadrilla.activa && Boolean(liderHabilitado(cuadrilla)));
    const seleccionada = disponibles.find(cuadrilla => cuadrilla.id === Number(cuadrillaId));

    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!seleccionada || guardando) return;
        setGuardando(true);
        setError('');
        try {
            const resultado = await asignarOrden(orden.id, {
                cuadrillaId: seleccionada.id,
                motivo: motivo.trim(),
                ...(fecha ? { fechaProgramada: new Date(fecha).toISOString() } : {}),
            });
            onAssigned(resultado);
        } catch (fallo) {
            setError(fallo instanceof Error ? fallo.message : 'No fue posible asignar la orden.');
        } finally {
            setGuardando(false);
        }
    }

    return (
        <section className="tk-assign-layout" aria-label="Asignar orden de trabajo">
            <form className="card tk-assign-form" onSubmit={event => void guardar(event)}>
                <div className="card-title"><h4>Asignación operativa</h4></div>
                {error && <p className="notice error" role="alert">{error}</p>}
                {cargando ? <p role="status">Cargando cuadrillas…</p> : (
                    <div className="tk-assign-fields">
                        <label>Cuadrilla *
                            <select aria-label="Cuadrilla para asignación" value={cuadrillaId} required
                                onChange={event => setCuadrillaId(event.target.value)}>
                                <option value="">Selecciona una cuadrilla</option>
                                {disponibles.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                            </select>
                        </label>
                        <label>Técnico líder
                            <input aria-label="Técnico líder" readOnly value={seleccionada ? nombreLider(seleccionada) : 'Selecciona una cuadrilla'} />
                        </label>
                        <label>Programación
                            <input aria-label="Programación de asignación" type="datetime-local" value={fecha}
                                onChange={event => setFecha(event.target.value)} />
                        </label>
                        <label className="tk-assign-wide">Indicaciones para la cuadrilla *
                            <textarea aria-label="Motivo de asignación" required minLength={3} maxLength={1000}
                                value={motivo} onChange={event => setMotivo(event.target.value)} rows={4} />
                        </label>
                        {disponibles.length === 0 && <p className="form-hint tk-assign-wide">No hay cuadrillas activas con líder técnico habilitado. Configura una en Cuadrillas.</p>}
                    </div>
                )}
                <div className="tk-assign-actions">
                    <button type="button" className="secondary-button" onClick={onCancel}>Cancelar</button>
                    <button type="submit" className="primary-button" disabled={guardando || cargando || !seleccionada}>
                        {guardando ? 'Asignando…' : 'Confirmar asignación'}
                    </button>
                </div>
            </form>
            <aside className="card tk-summary-panel" aria-label="Resumen de la orden">
                <h4>Resumen de OT-{orden.numero}</h4>
                <p><strong>Cliente:</strong> {orden.clienteNombreRegistrado}</p>
                <p><strong>Ubicación:</strong> {orden.ubicacionNombreRegistrado}</p>
                <p><strong>Prioridad:</strong> {orden.prioridad}</p>
                <p>La asignación cambiará la orden a estado ASIGNADA y conservará su historial.</p>
            </aside>
        </section>
    );
}
