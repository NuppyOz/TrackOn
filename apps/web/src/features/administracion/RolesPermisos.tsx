import { useEffect, useState } from 'react';
import { listarRolesAcceso } from './administracion.api';
import type { Rol } from '../roles/roles.types';
import { Button, StatePanel } from '../../shared/ui';

const permisos: Record<string, string[]> = {
    ADMIN: ['Administrar usuarios y roles', 'Gestionar operación y catálogos', 'Consultar inteligencia y auditoría'],
    GTE_OPE: ['Gestionar operación y catálogos', 'Asignar y cerrar órdenes', 'Consultar inteligencia del negocio'],
    TEC: ['Consultar sus órdenes asignadas', 'Registrar diagnóstico y ejecución', 'Cargar evidencias del servicio'],
};

export default function RolesPermisos() {
    const [roles, setRoles] = useState<Rol[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);
    useEffect(() => {
        let vigente = true;
        void listarRolesAcceso().then(datos => { if (vigente) { setRoles(datos); setError(''); } })
            .catch(fallo => { if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los roles.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [recarga]);
    function actualizar() { setCargando(true); setRecarga(valor => valor + 1); }
    return <section className="tk-admin" aria-labelledby="roles-permisos-titulo">
        <div className="section-heading"><div><h2 id="roles-permisos-titulo">Roles y permisos</h2>
            <p>Consulta el alcance efectivo de cada perfil de acceso.</p></div><Button disabled={cargando} onClick={actualizar}>Actualizar</Button></div>
        {error && <StatePanel type="error" title={error} action={<Button onClick={actualizar}>Reintentar</Button>} />}
        {cargando && <StatePanel type="loading" title="Cargando roles y permisos…" />}
        {!cargando && !error && <div className="roles-grid">{roles.map(rol => <article className="card" key={rol.id}>
            <div className="roles-card-title"><span>{rol.cod}</span><h3>{rol.nombre}</h3></div>
            <p>{rol.descripcion ?? 'Perfil de acceso del sistema.'}</p>
            <h4>Permisos principales</h4>
            <ul>{(permisos[rol.cod] ?? ['Acceso según las políticas configuradas']).map(item => <li key={item}>{item}</li>)}</ul>
        </article>)}</div>}
        {!cargando && !error && roles.length === 0 && <StatePanel type="empty" title="No hay roles configurados" />}
        <p className="security-note">Los permisos se validan en la API en cada solicitud. La interfaz no sustituye la autorización del servidor.</p>
    </section>;
}
