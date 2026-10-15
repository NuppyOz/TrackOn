import { useEffect, useState } from 'react';
import { cambiarEstadoAcceso, listarRolesAcceso, listarUsuarios, type UsuarioAcceso } from './administracion.api';
import { listarEmpleados } from '../empleados/empleados.api';
import type { EmpleadoResumen } from '../empleados/empleados.types';
import type { Rol } from '../roles/roles.types';
import AccesoForm from './AccesoForm';
import { Button, StatePanel, StatusBadge } from '../../shared/ui';

export default function UsuariosManager() {
    const [usuarios, setUsuarios] = useState<UsuarioAcceso[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [cargando, setCargando] = useState(true);
    const [recarga, setRecarga] = useState(0);
    const [buscar, setBuscar] = useState('');
    const [rol, setRol] = useState('');
    const [formulario, setFormulario] = useState(false);
    const [editando, setEditando] = useState<UsuarioAcceso | null>(null);
    const [confirmacion, setConfirmacion] = useState<UsuarioAcceso | null>(null);
    const [guardando, setGuardando] = useState(false);
    useEffect(() => {
        let vigente = true;
        void Promise.all([listarUsuarios(), listarRolesAcceso(), listarEmpleados()])
            .then(([usuarios, roles, empleados]) => { if (vigente) { setUsuarios(usuarios); setRoles(roles); setEmpleados(empleados); setError(null); } })
            .catch(error => { if (vigente) setError(error instanceof Error ? error.message : 'No se pudieron cargar los accesos.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [recarga]);
    const disponibles = empleados.filter(item => item.active && !usuarios.some(usuario => usuario.empleado.id === item.id));
    const visibles = usuarios.filter(item => (!rol || item.rol.cod === rol) && `${item.identificador} ${item.empleado.codEmpleado} ${item.empleado.persona?.firstName} ${item.empleado.persona?.firstLastName}`.toLocaleLowerCase('es').includes(buscar.trim().toLocaleLowerCase('es')));
    async function cambiarEstado() {
        if (!confirmacion || guardando) return;
        setGuardando(true); setError(null);
        try { await cambiarEstadoAcceso(confirmacion.id, !confirmacion.activo); setConfirmacion(null); setRecarga(valor => valor + 1); }
        catch (error) { setError(error instanceof Error ? error.message : 'No se pudo cambiar el estado.'); }
        finally { setGuardando(false); }
    }
    return <section className="tk-admin" aria-labelledby="usuarios-titulo"><div className="section-heading"><div><h2 id="usuarios-titulo">Usuarios y acceso</h2><p>Administra cuentas, roles y estados de acceso.</p></div>{!formulario && <Button variant="primary" onClick={() => { setEditando(null); setFormulario(true); }}>+ Crear usuario</Button>}</div>
        {error && <StatePanel type="error" title={error} action={<Button onClick={() => setRecarga(valor => valor + 1)}>Reintentar</Button>} />}
        {cargando && <StatePanel type="loading" title="Cargando usuarios…" />}
        {formulario ? <AccesoForm usuario={editando} roles={roles} empleados={disponibles} onCancel={() => setFormulario(false)} onSaved={() => { setFormulario(false); setRecarga(valor => valor + 1); }} /> : <>
            <div className="filters"><input aria-label="Buscar usuario" placeholder="Usuario, identificador o empleado" value={buscar} onChange={event => setBuscar(event.target.value)} /><select aria-label="Filtrar rol de usuario" value={rol} onChange={event => setRol(event.target.value)}><option value="">Todos los roles</option>{roles.map(item => <option key={item.id} value={item.cod}>{item.nombre}</option>)}</select><Button onClick={() => { setBuscar(''); setRol(''); }}>Limpiar</Button></div>
            <div className="tk-dashboard-body"><div className="card list-card"><div className="table-wrap"><table><thead><tr><th>Usuario</th><th>Empleado</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visibles.map(item => <tr key={item.id}><td data-label="Usuario">{item.identificador}</td><td data-label="Empleado">{item.empleado.persona?.firstName} {item.empleado.persona?.firstLastName}<small>{item.empleado.codEmpleado}</small></td><td data-label="Rol">{item.rol.nombre}</td><td data-label="Estado"><StatusBadge active={item.activo} /></td><td data-label="Acciones" className="actions"><Button onClick={() => { setEditando(item); setFormulario(true); }}>Editar acceso</Button><Button onClick={() => setConfirmacion(item)}>{item.activo ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table></div>
                {!cargando && visibles.length === 0 && <StatePanel type="empty" title="Sin usuarios para estos filtros" />}</div><aside className="card tk-dashboard-list"><h3>Roles de acceso</h3>{roles.map(item => <div key={item.id}><strong>{item.nombre}</strong><p>{item.descripcion ?? item.cod}</p></div>)}</aside></div>
        </>}
        {confirmacion && <div className="card form-card" role="dialog" aria-labelledby="confirmar-acceso"><h3 id="confirmar-acceso">{confirmacion.activo ? 'Desactivar' : 'Activar'} {confirmacion.identificador}</h3><p>El cambio actualizará el acceso de esta cuenta al sistema.</p><Button disabled={guardando} onClick={() => setConfirmacion(null)}>Cancelar</Button><Button variant="primary" loading={guardando} onClick={() => void cambiarEstado()}>Confirmar</Button></div>}
    </section>;
}
