import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';
import { Button, StatePanel } from '../../shared/ui';

interface RegistroAuditoria { id: number; entidad: string; entidadId: string; accion: string; fecha: string; usuario: { identificador: string } | null }

const entidades: Array<[string, string]> = [
    ['ORDEN_TRABAJO', 'Orden de trabajo'],
    ['CLIENTE', 'Cliente'],
    ['USUARIO', 'Usuario'],
    ['EVIDENCIA', 'Evidencia'],
    ['COTIZACION', 'Cotización'],
];
const acciones: Array<[string, string]> = [
    ['CAMBIO_ESTADO', 'Cambio de estado'],
    ['CREACION', 'Creación'],
    ['EDICION', 'Edición'],
    ['SEED_DEMO', 'Carga de datos'],
];

const etiqueta = (lista: Array<[string, string]>, valor: string) =>
    lista.find(([codigo]) => codigo === valor)?.[1] ?? valor.replaceAll('_', ' ').toLocaleLowerCase('es-NI');

const fechaCorta = new Intl.DateTimeFormat('es-NI', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Managua' });

export default function AuditoriaManager() {
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<Pagina<RegistroAuditoria> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [entidad, setEntidad] = useState('');
    const [accion, setAccion] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');

    useEffect(() => {
        let vigente = true;
        const consulta = new URLSearchParams({ pagina: String(pagina), limite: '25' });
        if (entidad) consulta.set('entidad', entidad);
        if (accion) consulta.set('accion', accion);
        if (desde) consulta.set('desde', `${desde}T00:00:00-06:00`);
        if (hasta) consulta.set('hasta', `${hasta}T23:59:59-06:00`);
        void api<Pagina<RegistroAuditoria>>(`/api/auditoria?${consulta}`)
            .then(respuesta => { if (vigente) { setDatos(respuesta); setError(null); } })
            .catch(fallo => { if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudo consultar la auditoría.'); });
        return () => { vigente = false; };
    }, [pagina, recarga, entidad, accion, desde, hasta]);

    const hayFiltros = Boolean(entidad || accion || desde || hasta);
    function limpiar() {
        setEntidad(''); setAccion(''); setDesde(''); setHasta(''); setPagina(1);
    }

    return <section>
        <div className="section-heading"><div><h2>Auditoría</h2><p>Trazabilidad de operaciones: actor, fecha y registro afectado.</p></div><Button onClick={() => setRecarga(valor => valor + 1)}>Actualizar</Button></div>
        <div className="filters">
            <label>Entidad<select value={entidad} onChange={event => { setEntidad(event.target.value); setPagina(1); }}><option value="">Todas</option>{entidades.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}</select></label>
            <label>Acción<select value={accion} onChange={event => { setAccion(event.target.value); setPagina(1); }}><option value="">Todas</option>{acciones.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}</select></label>
            <label>Desde<input type="date" value={desde} max={hasta || undefined} onChange={event => { setDesde(event.target.value); setPagina(1); }} /></label>
            <label>Hasta<input type="date" value={hasta} min={desde || undefined} onChange={event => { setHasta(event.target.value); setPagina(1); }} /></label>
            <Button onClick={limpiar} disabled={!hayFiltros}>Limpiar filtros</Button>
        </div>
        {error && <StatePanel type="error" title={error} />}
        {!datos && !error && <StatePanel type="loading" title="Cargando auditoría…" />}
        {datos && <div className="card list-card"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Actor</th><th>Entidad</th><th>Registro</th><th>Acción</th></tr></thead><tbody>{datos.items.map(item => <tr key={item.id}><td data-label="Fecha">{fechaCorta.format(new Date(item.fecha))}</td><td data-label="Actor">{item.usuario?.identificador ?? 'Sistema'}</td><td data-label="Entidad">{etiqueta(entidades, item.entidad)}</td><td data-label="Registro">#{item.entidadId}</td><td data-label="Acción">{etiqueta(acciones, item.accion)}</td></tr>)}</tbody></table></div>
            {datos.items.length === 0 && <StatePanel type="empty" title="Sin operaciones para estos filtros" />}
            <div className="pagination"><Button disabled={pagina === 1} onClick={() => setPagina(valor => valor - 1)}>Anterior</Button><span aria-live="polite">Página {pagina}</span><Button disabled={!datos.hayMas} onClick={() => setPagina(valor => valor + 1)}>Siguiente</Button></div></div>}
    </section>;
}
