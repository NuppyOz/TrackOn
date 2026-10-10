import { useEffect, useState, type SyntheticEvent } from 'react';
import {
    guardarDiagnosticoOrden,
    listarEquiposDisponiblesOrden,
    listarEquiposOrden,
    vincularEquipoOrden,
} from './ordenes.equipos.api';
import type { EquipoDisponibleOrden, RegistroEquipoOrden } from './ordenes.equipos.types';
import type { OrdenDetalle } from './ordenes.types';

interface Props {
    orden: OrdenDetalle;
    puedeGestionar: boolean;
}

function descripcionEquipo(equipo: EquipoDisponibleOrden) {
    return `${equipo.codigo} · ${equipo.tipo}${equipo.marca ? ` · ${equipo.marca}` : ''}`;
}

function mensajeError(error: unknown) {
    return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

export default function EquiposOrdenPanel({ orden, puedeGestionar }: Readonly<Props>) {
    const [registros, setRegistros] = useState<RegistroEquipoOrden[]>([]);
    const [disponibles, setDisponibles] = useState<EquipoDisponibleOrden[]>([]);
    const [equipoId, setEquipoId] = useState('');
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [diagnostico, setDiagnostico] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [resultado, setResultado] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');

    const puedeVincular = puedeGestionar && ['PENDIENTE', 'ASIGNADA', 'EN_EJECUCION'].includes(orden.estadoCodigo);
    const puedeDiagnosticar = orden.estadoCodigo === 'EN_EJECUCION';

    useEffect(() => {
        let vigente = true;
        Promise.all([
            listarEquiposOrden(orden.id),
            puedeGestionar ? listarEquiposDisponiblesOrden(orden.id) : Promise.resolve([] as EquipoDisponibleOrden[]),
        ])
            .then(([lista, equipos]) => {
                if (!vigente) return;
                setRegistros(lista);
                setDisponibles(equipos);
                setError('');
            })
            .catch((fallo: unknown) => { if (vigente) setError(mensajeError(fallo)); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [orden.id, puedeGestionar]);

    async function vincular(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!puedeVincular || !equipoId || guardando) return;
        setGuardando(true);
        setError('');
        setAviso('');
        try {
            const vinculado = await vincularEquipoOrden(orden.id, Number(equipoId));
            setRegistros(actual => [...actual, vinculado]);
            setDisponibles(actual => actual.filter(item => item.id !== Number(equipoId)));
            setEquipoId('');
            setAviso('Equipo vinculado correctamente.');
        } catch (fallo) {
            setError(mensajeError(fallo));
        } finally {
            setGuardando(false);
        }
    }

    function editar(item: RegistroEquipoOrden) {
        setEditandoId(item.id);
        setDiagnostico(item.diagnostico ?? '');
        setObservaciones(item.observaciones ?? '');
        setResultado(item.resultado ?? '');
        setError('');
        setAviso('');
    }

    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        if (editandoId === null || !puedeDiagnosticar || guardando) return;
        setGuardando(true);
        setError('');
        setAviso('');
        try {
            const actualizado = await guardarDiagnosticoOrden(orden.id, editandoId, {
                diagnostico: diagnostico.trim(),
                observaciones: observaciones.trim() || null,
                resultado: resultado.trim() || null,
            });
            setRegistros(actual => actual.map(item => item.id === editandoId ? actualizado : item));
            setEditandoId(null);
            setAviso('Diagnóstico guardado correctamente.');
        } catch (fallo) {
            setError(mensajeError(fallo));
        } finally {
            setGuardando(false);
        }
    }

    return (
        <section className="tk-equipo-orden" aria-label="Equipos intervenidos">
            <div className="tk-equipo-orden-heading">
                <div>
                    <h4>Equipos intervenidos</h4>
                    <p>Equipos de {orden.ubicacionNombreRegistrado}. Registra el diagnóstico de cada uno durante la ejecución.</p>
                </div>
                <span className="tk-equipo-cantidad">{registros.length} registrados</span>
            </div>
            {error && <p className="notice error" role="alert">{error}</p>}
            {aviso && <output className="notice exito">{aviso}</output>}
            {cargando ? <p role="status">Cargando equipos de la orden…</p> : (
                <>
                    {puedeVincular && (
                        <form className="tk-equipo-vincular" onSubmit={event => void vincular(event)}>
                            <label>Equipo de la ubicación
                                <select aria-label="Equipo de la ubicación" required value={equipoId}
                                    onChange={event => setEquipoId(event.target.value)}>
                                    <option value="">Selecciona un equipo</option>
                                    {disponibles.map(item => <option key={item.id} value={item.id}>{descripcionEquipo(item)}</option>)}
                                </select>
                            </label>
                            <button type="submit" className="primary-button" disabled={guardando || !equipoId}>
                                {guardando ? 'Guardando…' : 'Vincular equipo'}
                            </button>
                            {disponibles.length === 0 && <p className="tk-equipo-ayuda">No hay más equipos activos de esta ubicación disponibles para vincular.</p>}
                        </form>
                    )}
                    {registros.length === 0 ? (
                        <p className="tk-equipo-vacio">Todavía no hay equipos vinculados a esta orden.</p>
                    ) : (
                        <div className="tk-equipo-lista">
                            {registros.map(item => (
                                <article className="tk-equipo-tarjeta" key={item.id}>
                                    <div className="tk-equipo-top">
                                        <div>
                                            <strong>{item.equipo?.codigo ?? 'Equipo provisional'}</strong>
                                            <p>{item.tipoRegistrado ?? item.equipo?.tipo ?? 'Sin tipo registrado'} · {item.marcaRegistrada ?? 'Sin marca'}</p>
                                        </div>
                                        {item.diagnostico && <span className="tk-equipo-diagnosticado">Diagnóstico registrado</span>}
                                    </div>
                                    <dl className="tk-equipo-datos">
                                        <div><dt>Modelo</dt><dd>{item.modeloRegistrado ?? 'No disponible'}</dd></div>
                                        <div><dt>Número de serie</dt><dd>{item.serieRegistrada ?? 'No disponible'}</dd></div>
                                    </dl>
                                    {item.diagnostico && <div className="tk-equipo-descripcion">
                                        <strong>Diagnóstico</strong><p>{item.diagnostico}</p>
                                        {item.observaciones && <p><b>Observaciones:</b> {item.observaciones}</p>}
                                        {item.resultado && <p><b>Resultado:</b> {item.resultado}</p>}
                                    </div>}
                                    {puedeDiagnosticar && editandoId !== item.id && (
                                        <button type="button" className="tk-action-button" onClick={() => editar(item)}>
                                            {item.diagnostico ? 'Editar diagnóstico' : 'Registrar diagnóstico'}
                                        </button>
                                    )}
                                    {puedeDiagnosticar && editandoId === item.id && (
                                        <form className="tk-equipo-diagnostico" onSubmit={event => void guardar(event)}>
                                            <label>Diagnóstico *
                                                <textarea aria-label="Diagnóstico" rows={3} required minLength={10} maxLength={5000}
                                                    value={diagnostico} onChange={event => setDiagnostico(event.target.value)} />
                                            </label>
                                            <div className="tk-equipo-campos">
                                                <label>Observaciones
                                                    <textarea aria-label="Observaciones del equipo" rows={2} maxLength={5000}
                                                        value={observaciones} onChange={event => setObservaciones(event.target.value)} />
                                                </label>
                                                <label>Resultado
                                                    <textarea aria-label="Resultado del equipo" rows={2} maxLength={5000}
                                                        value={resultado} onChange={event => setResultado(event.target.value)} />
                                                </label>
                                            </div>
                                            <div className="tk-equipo-acciones">
                                                <button type="button" className="secondary-button" disabled={guardando}
                                                    onClick={() => setEditandoId(null)}>Cancelar</button>
                                                <button type="submit" className="primary-button" disabled={guardando || diagnostico.trim().length < 10}>
                                                    {guardando ? 'Guardando…' : 'Guardar diagnóstico'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                    {puedeDiagnosticar && <small className="tk-equipo-ayuda">Solo los técnicos asignados a la orden y los responsables autorizados pueden guardar diagnósticos.</small>}
                </>
            )}
        </section>
    );
}
