import { useEffect, useMemo, useState } from 'react';
import Agenda from '../agenda/Agenda';
import { listarOrdenes } from '../ordenes/ordenes.api';
import type { EstadoOrden, OrdenResumen } from '../ordenes/ordenes.types';
import { irA } from '../../shared/navigation';
import './field.css';

type SeccionField = 'registro' | 'inspeccion' | 'creacion' | 'instalacion' | 'inicio-trabajo' |
    'fotos-iniciales' | 'calendario' | 'tecnicos' | 'mis-ordenes';

const secciones: ReadonlyArray<{ id: SeccionField; etiqueta: string; ayuda: string }> = [
    { id: 'registro', etiqueta: 'Registro', ayuda: 'Consulta los servicios registrados para atención en campo.' },
    { id: 'inspeccion', etiqueta: 'Inspección', ayuda: 'Abre una orden asignada y documenta el diagnóstico del equipo.' },
    { id: 'creacion', etiqueta: 'Creación', ayuda: 'Registra un equipo provisional cuando no exista en el inventario.' },
    { id: 'instalacion', etiqueta: 'Instalación', ayuda: 'Documenta servicios y materiales utilizados durante la instalación.' },
    { id: 'inicio-trabajo', etiqueta: 'Inicio del trabajo', ayuda: 'Inicia las órdenes que ya fueron asignadas.' },
    { id: 'fotos-iniciales', etiqueta: 'Fotos iniciales', ayuda: 'Carga evidencias desde la intervención de cada equipo.' },
    { id: 'calendario', etiqueta: 'Calendario', ayuda: 'Revisa las visitas programadas por fecha.' },
    { id: 'tecnicos', etiqueta: 'Técnicos', ayuda: 'Consulta los responsables visibles en las asignaciones vigentes.' },
    { id: 'mis-ordenes', etiqueta: 'Mis órdenes', ayuda: 'Da seguimiento a las órdenes disponibles para tu sesión.' },
];

const estadosPorSeccion: Partial<Record<SeccionField, EstadoOrden[]>> = {
    inspeccion: ['EN_EJECUCION'], creacion: ['EN_EJECUCION'], instalacion: ['EN_EJECUCION'],
    'inicio-trabajo': ['ASIGNADA'], 'fotos-iniciales': ['EN_EJECUCION'],
};

function fecha(valor: string | null) {
    return valor ? new Intl.DateTimeFormat('es-NI', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor)) : 'Sin programar';
}

export default function FieldWorkspace({ ruta, onOrden }: Readonly<{ ruta: string; onOrden: (id: number) => void }>) {
    const segmento = ruta.split('/').filter(Boolean)[1];
    const seccion = secciones.find(item => item.id === segmento)?.id ?? 'mis-ordenes';
    const activa = secciones.find(item => item.id === seccion) ?? secciones[8];
    const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        if (seccion === 'calendario') return;
        let vigente = true;
        void listarOrdenes({ estado: '', buscar: '', pagina: 1, limite: 100 })
            .then(resultado => { if (vigente) { setOrdenes(resultado.items); setError(''); } })
            .catch(fallo => { if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar las órdenes.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [seccion, recarga]);

    const visibles = useMemo(() => {
        const estados = estadosPorSeccion[seccion];
        return estados ? ordenes.filter(item => estados.includes(item.estadoCodigo)) : ordenes;
    }, [ordenes, seccion]);

    const tecnicos = useMemo(() => Array.from(new Set(ordenes.map(item => item.asignaciones?.[0]?.empleadoResponsable)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map(item => `${item.persona.firstName} ${item.persona.firstLastName}`))).sort(), [ordenes]);

    return <section className="field-scope" aria-labelledby="field-titulo">
        <header className="field-header"><div><p>Operación móvil</p><h2 id="field-titulo">TrackOn Field</h2><span>{activa.ayuda}</span></div></header>
        <nav className="field-nav" aria-label="Submódulos de TrackOn Field">
            {secciones.map(item => <button key={item.id} type="button" aria-current={item.id === seccion ? 'page' : undefined}
                onClick={() => { setCargando(true); irA(`/field/${item.id}`); }}>{item.etiqueta}</button>)}
        </nav>
        {seccion === 'calendario' ? <Agenda onOrden={onOrden} /> : <div className="field-card">
            <div className="field-card-heading"><div><h3>{activa.etiqueta}</h3><p>{activa.ayuda}</p></div>
                <button type="button" className="secondary-button" disabled={cargando} onClick={() => { setCargando(true); setRecarga(valor => valor + 1); }}>Actualizar</button></div>
            {error && <p className="notice error" role="alert">{error}</p>}
            {cargando && <p role="status">Cargando operación de campo…</p>}
            {!cargando && !error && seccion === 'tecnicos' && (tecnicos.length ? <ul className="field-technicians">
                {tecnicos.map(nombre => <li key={nombre}><span aria-hidden="true">●</span><strong>{nombre}</strong><small>Asignación vigente</small></li>)}
            </ul> : <p className="field-empty">No hay responsables individuales en las asignaciones visibles.</p>)}
            {!cargando && !error && seccion !== 'tecnicos' && (visibles.length ? <div className="field-orders">
                {visibles.map(orden => <article key={orden.id}>
                    <div><span className="tk-status-badge" data-status={orden.estadoCodigo}>{orden.estadoCodigo.replaceAll('_', ' ')}</span><strong>OT-{orden.numero} · {orden.clienteNombreRegistrado}</strong><p>{orden.solicitud}</p><small>{orden.ubicacionNombreRegistrado} · {fecha(orden.fechaProgramada)}</small></div>
                    <button type="button" className="primary-button" onClick={() => onOrden(orden.id)}>Abrir orden</button>
                </article>)}
            </div> : <p className="field-empty">No hay órdenes para esta etapa.</p>)}
        </div>}
    </section>;
}
