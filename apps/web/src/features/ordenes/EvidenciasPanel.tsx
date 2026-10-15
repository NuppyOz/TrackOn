import { useEffect, useId, useState, type SyntheticEvent } from 'react';
import { cargarEvidencia, descargarEvidencia, listarEvidencias, prepararEvidencia, revisarEvidencia, type EvidenciaOrden } from './ordenes.evidencias.api';
import { Button } from '../../shared/ui';

interface Props { ordenId: number; registroId: number; puedeCargar: boolean; puedeRevisar: boolean }

export default function EvidenciasPanel({ ordenId, registroId, puedeCargar, puedeRevisar }: Readonly<Props>) {
    const id = useId();
    const [evidencias, setEvidencias] = useState<EvidenciaOrden[]>([]);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [reemplazo, setReemplazo] = useState<EvidenciaOrden | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [recarga, setRecarga] = useState(0);
    const [revision, setRevision] = useState<EvidenciaOrden | null>(null);
    const [observacion, setObservacion] = useState('');
    const [pendiente, setPendiente] = useState<{ evidencia: EvidenciaOrden; contenido: ArrayBuffer } | null>(null);
    useEffect(() => {
        let vigente = true;
        void listarEvidencias(ordenId, registroId).then(items => { if (vigente) setEvidencias(items); })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudieron cargar las evidencias.'); });
        return () => { vigente = false; };
    }, [ordenId, registroId, recarga]);
    function fallo(error: unknown) { setError(error instanceof Error ? error.message : 'No se pudo completar la operación.'); }
    async function subir(event?: SyntheticEvent<HTMLFormElement>) {
        event?.preventDefault(); if (ocupado || (!archivo && !pendiente)) return;
        setOcupado(true); setError(null); setAviso(null);
        try {
            let carga = pendiente;
            if (!carga && archivo) { carga = await prepararEvidencia(ordenId, registroId, archivo, reemplazo?.id); setPendiente(carga); }
            if (!carga) return;
            await cargarEvidencia(ordenId, registroId, carga.evidencia.id, carga.contenido);
            setPendiente(null); setArchivo(null); setReemplazo(null); setRecarga(valor => valor + 1);
            setAviso('Evidencia disponible para revisión.');
        } catch (error) { fallo(error); setRecarga(valor => valor + 1); }
        finally { setOcupado(false); }
    }
    async function descargar(item: EvidenciaOrden) {
        if (ocupado) return;
        setOcupado(true); setError(null);
        try {
            const blob = await descargarEvidencia(ordenId, registroId, item.id);
            const url = URL.createObjectURL(blob); const enlace = document.createElement('a');
            enlace.href = url; enlace.download = item.nombreOriginal; enlace.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { fallo(error); } finally { setOcupado(false); }
    }
    async function decidir(decision: 'ACEPTADA' | 'RECHAZADA') {
        if (!revision || ocupado) return;
        setOcupado(true); setError(null);
        try {
            await revisarEvidencia(ordenId, registroId, revision.id, decision, observacion);
            setRevision(null); setObservacion(''); setRecarga(valor => valor + 1); setAviso('Revisión de evidencia registrada.');
        } catch (error) { fallo(error); } finally { setOcupado(false); }
    }
    return <section className="tk-work-panel" aria-label="Evidencias del equipo"><h4>Evidencias</h4>
        {error && <p className="notice error" role="alert">{error}</p>}{aviso && <output>{aviso}</output>}
        {evidencias.length === 0 && <p>Sin evidencias registradas.</p>}
        <ul className="tk-work-list">{evidencias.map(item => <li key={item.id}><strong>{item.nombreOriginal}</strong><p>{item.estadoCarga} · {Math.ceil(item.tamanoBytes / 1024)} KB {item.revisiones?.[0]?.decision}</p>
            {item.reemplazos?.length ? <small>Conservada como histórico; tiene una evidencia de reemplazo.</small> : <>
                {item.revisiones?.[0]?.observacion && <p>{item.revisiones[0].observacion}</p>}
                {item.estadoCarga === 'DISPONIBLE' && <Button disabled={ocupado} onClick={() => void descargar(item)}>Descargar archivo</Button>}
                {puedeRevisar && item.estadoCarga === 'DISPONIBLE' && <Button disabled={ocupado} onClick={() => { setRevision(item); setObservacion(''); }}>Revisar evidencia</Button>}
                {puedeCargar && !pendiente && <Button disabled={ocupado} onClick={() => { setReemplazo(item); setArchivo(null); }}>Reemplazar archivo</Button>}
            </>}
        </li>)}</ul>
        {puedeCargar && <form className="tk-work-form" onSubmit={event => void subir(event)}>
            <label htmlFor={id}>{reemplazo ? `Reemplazar ${reemplazo.nombreOriginal}` : 'Agregar evidencia'} · JPG, PNG, WebP o PDF (máximo 8 MB)</label>
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={ocupado || pendiente !== null} onChange={event => setArchivo(event.target.files?.[0] ?? null)} />
            {pendiente && <p>La carga de {pendiente.evidencia.nombreOriginal} no terminó. Reintenta para conservar el mismo registro.</p>}
            <Button type="submit" variant="primary" disabled={!archivo && !pendiente} loading={ocupado}>{pendiente ? 'Reintentar carga' : 'Subir evidencia'}</Button>
            {reemplazo && !pendiente && <Button type="button" disabled={ocupado} onClick={() => setReemplazo(null)}>Cancelar reemplazo</Button>}
        </form>}
        {revision && <div className="tk-work-form"><h5>Revisar {revision.nombreOriginal}</h5><label htmlFor={`${id}-revision`}>Observaciones de revisión</label><textarea id={`${id}-revision`} maxLength={2000} rows={3} value={observacion} onChange={event => setObservacion(event.target.value)} />
            <div className="tk-form-actions"><Button disabled={ocupado} onClick={() => setRevision(null)}>Cancelar</Button><Button variant="primary" disabled={ocupado} onClick={() => void decidir('ACEPTADA')}>Aprobar</Button><Button variant="danger" disabled={ocupado || observacion.trim().length < 5} onClick={() => void decidir('RECHAZADA')}>Rechazar</Button></div>
        </div>}
    </section>;
}
