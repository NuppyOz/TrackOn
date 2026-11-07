import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import type { Pagina } from '../../shared/pagination';
import { Button, StatePanel } from '../../shared/ui';
import { Paginacion } from '../../shared/Paginacion';

interface RegistroAuditoria { id: number; entidad: string; entidadId: string; accion: string; fecha: string; usuario: { identificador: string } | null }
export default function AuditoriaManager() {
    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(10);
    const [datos, setDatos] = useState<Pagina<RegistroAuditoria> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    useEffect(() => {
        let vigente = true;
        void api<Pagina<RegistroAuditoria>>(`/api/auditoria?pagina=${pagina}&limite=${limite}`).then(datos => { if (vigente) { setDatos(datos); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudo consultar la auditoría.'); });
        return () => { vigente = false; };
    }, [pagina, limite, recarga]);
    return <section><div className="section-heading"><div><h2>Auditoría</h2><p>Trazabilidad de operaciones: actor, fecha y registro afectado.</p></div><Button onClick={() => setRecarga(valor => valor + 1)}>Actualizar</Button></div>
        {error && <StatePanel type="error" title={error} />}
        {!datos && !error && <StatePanel type="loading" title="Cargando auditoría…" />}
        {datos && <div className="card list-card"><div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Actor</th><th>Entidad</th><th>Registro</th><th>Acción</th></tr></thead><tbody>{datos.items.map(item => <tr key={item.id}><td data-label="Fecha">{new Intl.DateTimeFormat('es-NI', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Managua' }).format(new Date(item.fecha))}</td><td data-label="Actor">{item.usuario?.identificador ?? 'Sistema'}</td><td data-label="Entidad">{item.entidad}</td><td data-label="Registro">{item.entidadId}</td><td data-label="Acción">{item.accion.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>
            {datos.items.length === 0 && <StatePanel type="empty" title="Sin operaciones registradas" />}
            <Paginacion pagina={pagina} limite={limite} hayMas={datos.hayMas} total={datos.total} etiqueta="Paginación de auditoría" onPagina={setPagina} onLimite={nuevo => { setLimite(nuevo); setPagina(1); }} /></div>}
    </section>;
}
