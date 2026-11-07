import { useEffect, useState } from 'react';
import { listarRolesAcceso, listarUsuarios, type UsuarioAcceso } from './administracion.api';
import type { Rol } from '../roles/roles.types';
import { Button, StatePanel } from '../../shared/ui';

/**
 * Esta pantalla muestra datos reales: los perfiles que existen, las cuentas que
 * los usan y los permisos por usuario que están guardados. No inventa un mapa de
 * permisos ni promete una validación que el servidor no hace: hoy la API autoriza
 * por perfil, y los permisos por usuario se conservan para una etapa posterior.
 */
export default function RolesPermisos() {
    const [roles, setRoles] = useState<Rol[]>([]);
    const [usuarios, setUsuarios] = useState<UsuarioAcceso[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        void Promise.all([listarRolesAcceso(), listarUsuarios()])
            .then(([rolesDatos, usuariosDatos]) => {
                if (!vigente) return;
                setRoles(rolesDatos);
                setUsuarios(usuariosDatos);
                setError('');
            })
            .catch(fallo => {
                if (vigente) setError(fallo instanceof Error ? fallo.message : 'No se pudieron cargar los roles y permisos.');
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => {
            vigente = false;
        };
    }, [recarga]);

    function actualizar() {
        setRecarga(valor => valor + 1);
    }

    return (
        <section className="tk-admin" aria-labelledby="roles-permisos-titulo">
            <div className="section-heading">
                <div>
                    <h2 id="roles-permisos-titulo">Roles y permisos</h2>
                    <p>Qué perfil tiene cada cuenta y qué permisos por usuario están registrados.</p>
                </div>
                <Button disabled={cargando} onClick={actualizar}>
                    Actualizar
                </Button>
            </div>

            {error && <StatePanel type="error" title={error} action={<Button onClick={actualizar}>Reintentar</Button>} />}
            {cargando && <StatePanel type="loading" title="Cargando roles y permisos…" />}

            {!cargando && !error && (
                <>
                    <div className="roles-grid">
                        {roles.map(rol => {
                            const cuentas = usuarios.filter(usuario => usuario.rol.cod === rol.cod);
                            return (
                                <article className="card" key={rol.id}>
                                    <div className="roles-card-title">
                                        <span>{rol.cod}</span>
                                        <h3>{rol.nombre}</h3>
                                    </div>
                                    <p>{rol.descripcion ?? 'Perfil de acceso del sistema.'}</p>
                                    <h4>Cuentas con este perfil ({cuentas.length})</h4>
                                    <ul>
                                        {cuentas.length === 0 && <li>Sin cuentas asignadas.</li>}
                                        {cuentas.map(cuenta => (
                                            <li key={cuenta.id}>
                                                {cuenta.identificador}
                                                {!cuenta.activo && ' · inactiva'}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>

                    <section className="card" aria-labelledby="permisos-usuario-titulo">
                        <h3 id="permisos-usuario-titulo">Permisos registrados por usuario</h3>
                        <p>Los permisos por usuario se guardan en la cuenta; todavía no se editan desde esta pantalla.</p>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Perfil</th>
                                        <th>Permisos registrados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.map(cuenta => (
                                        <tr key={cuenta.id}>
                                            <td data-label="Usuario">{cuenta.identificador}</td>
                                            <td data-label="Perfil">{cuenta.rol.nombre}</td>
                                            <td data-label="Permisos registrados">
                                                {cuenta.permisos?.length ? cuenta.permisos.join(' · ') : 'Sin permisos registrados'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {!cargando && !error && roles.length === 0 && <StatePanel type="empty" title="No hay roles configurados" />}

            <p className="security-note">
                La API autoriza <strong>por perfil</strong> en cada solicitud: el rol decide a qué módulos entra la
                cuenta. Los permisos por usuario se guardan para una etapa posterior y{' '}
                <strong>todavía no restringen el acceso</strong>.
            </p>
        </section>
    );
}
