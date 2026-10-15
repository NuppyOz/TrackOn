import { useEffect, useId, useState, type SyntheticEvent } from 'react';
import { buscarMateriales, buscarServicios, listarTrabajo, registrarMaterial, registrarServicio, type TrabajoEquipo } from './ordenes.trabajo.api';
import { Button, StatePanel } from '../../shared/ui';

type Opcion = { id: number; codigo: string; nombre: string; unidadMedida?: string };

function RegistroTrabajoForm({ tipo, ordenId, registroId, onSaved, onCancel }: Readonly<{
    tipo: 'servicio' | 'material'; ordenId: number; registroId: number; onSaved: () => void; onCancel: () => void;
}>) {
    const id = useId();
    const [buscar, setBuscar] = useState('');
    const [opciones, setOpciones] = useState<Opcion[]>([]);
    const [seleccion, setSeleccion] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const [descripcion, setDescripcion] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [hayMas, setHayMas] = useState(false);
    useEffect(() => {
        let vigente = true;
        const timer = setTimeout(() => {
            const operacion = tipo === 'servicio' ? buscarServicios(buscar) : buscarMateriales(buscar);
            void operacion.then(pagina => { if (vigente) { setOpciones(pagina.items); setHayMas(pagina.hayMas); } })
                .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.'); })
                .finally(() => { if (vigente) setCargando(false); });
        }, 250);
        return () => { vigente = false; clearTimeout(timer); };
    }, [buscar, tipo]);
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault(); if (guardando) return;
        setGuardando(true); setError(null);
        try {
            if (tipo === 'servicio') await registrarServicio(ordenId, registroId, { servicioId: Number(seleccion), cantidad: Number(cantidad), descripcionTrabajo: descripcion.trim() });
            else await registrarMaterial(ordenId, registroId, { materialId: Number(seleccion), cantidad: Number(cantidad), observacion: descripcion.trim() || null });
            onSaved();
        } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo registrar el trabajo.'); }
        finally { setGuardando(false); }
    }
    return <form className="tk-work-form" onSubmit={event => void guardar(event)}>
        <h5>Registrar {tipo}</h5>{error && <p className="notice error" role="alert">{error}</p>}
        <label htmlFor={`${id}-buscar`}>Buscar en el catálogo</label><input id={`${id}-buscar`} value={buscar} placeholder="Código o nombre" onChange={event => { setBuscar(event.target.value); setSeleccion(''); setCargando(true); }} />
        {hayMas && <p>Escribe un nombre o código para encontrar más resultados.</p>}
        <label htmlFor={`${id}-opcion`}>{tipo === 'servicio' ? 'Servicio' : 'Material'} *</label>
        <select id={`${id}-opcion`} required value={seleccion} disabled={cargando} onChange={event => setSeleccion(event.target.value)}>
            <option value="">{cargando ? 'Cargando catálogo…' : 'Selecciona una opción'}</option>
            {opciones.map(item => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}{item.unidadMedida ? ` (${item.unidadMedida})` : ''}</option>)}
        </select>
        {!cargando && opciones.length === 0 && <p>No hay opciones activas. Revisa el catálogo o cambia la búsqueda.</p>}
        <label htmlFor={`${id}-cantidad`}>Cantidad *</label><input id={`${id}-cantidad`} type="number" required min="0.001" max="999999999.999" step="0.001" value={cantidad} onChange={event => setCantidad(event.target.value)} />
        <label htmlFor={`${id}-descripcion`}>{tipo === 'servicio' ? 'Trabajo realizado *' : 'Observación'}</label>
        <textarea id={`${id}-descripcion`} required={tipo === 'servicio'} minLength={tipo === 'servicio' ? 5 : undefined} maxLength={5000} rows={3} value={descripcion} onChange={event => setDescripcion(event.target.value)} />
        <div className="tk-form-actions"><Button type="button" disabled={guardando} onClick={onCancel}>Cancelar</Button><Button type="submit" variant="primary" loading={guardando} disabled={!seleccion || cargando}>Guardar {tipo}</Button></div>
    </form>;
}

export default function TrabajoEquipoPanel({ ordenId, registroId, puedeRegistrar }: Readonly<{ ordenId: number; registroId: number; puedeRegistrar: boolean }>) {
    const [trabajo, setTrabajo] = useState<TrabajoEquipo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [formulario, setFormulario] = useState<'servicio' | 'material' | null>(null);
    useEffect(() => {
        let vigente = true;
        void listarTrabajo(ordenId, registroId).then(datos => { if (vigente) { setTrabajo(datos); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo cargar el trabajo.'); });
        return () => { vigente = false; };
    }, [ordenId, registroId, recarga]);
    return <section className="tk-work-panel" aria-label="Servicios y materiales del equipo">
        <h4>Trabajo realizado</h4>
        {error && <StatePanel type="error" title={error} action={<Button onClick={() => setRecarga(valor => valor + 1)}>Reintentar</Button>} />}
        {!trabajo && !error && <StatePanel type="loading" title="Cargando trabajo…" />}
        {trabajo && <><h5>Servicios realizados</h5>{trabajo.servicios.length === 0 ? <p>Sin servicios registrados.</p> : <ul className="tk-work-list">{trabajo.servicios.map(item => <li key={item.id}><strong>{item.nombreRegistrado} · {item.cantidad}</strong><p>{item.descripcionTrabajo}</p></li>)}</ul>}
            <h5>Materiales utilizados</h5>{trabajo.materiales.length === 0 ? <p>Sin consumo de materiales registrado.</p> : <ul className="tk-work-list">{trabajo.materiales.map(item => <li key={item.id}><strong>{item.nombreRegistrado} · {item.cantidad} {item.unidadRegistrada}</strong>{item.observacion && <p>{item.observacion}</p>}</li>)}</ul>}
        </>}
        {puedeRegistrar && !formulario && <div className="tk-form-actions"><Button onClick={() => setFormulario('servicio')}>+ Registrar servicio</Button><Button onClick={() => setFormulario('material')}>+ Registrar material</Button></div>}
        {puedeRegistrar && formulario && <RegistroTrabajoForm tipo={formulario} ordenId={ordenId} registroId={registroId} onCancel={() => setFormulario(null)} onSaved={() => { setFormulario(null); setRecarga(valor => valor + 1); }} />}
    </section>;
}
