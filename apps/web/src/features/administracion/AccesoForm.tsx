import { useState, type SyntheticEvent } from 'react';
import { guardarAcceso, type UsuarioAcceso } from './administracion.api';
import type { Rol } from '../roles/roles.types';
import type { EmpleadoResumen } from '../empleados/empleados.types';
import { Button } from '../../shared/ui';

export default function AccesoForm({ usuario, roles, empleados, onSaved, onCancel }: Readonly<{ usuario: UsuarioAcceso | null; roles: Rol[]; empleados: EmpleadoResumen[]; onSaved: () => void; onCancel: () => void }>) {
    const [identificador, setIdentificador] = useState(usuario?.identificador ?? '');
    const [rolId, setRolId] = useState(String(usuario?.rol.id ?? ''));
    const [empleadoId, setEmpleadoId] = useState('');
    const [password, setPassword] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault(); if (guardando) return;
        setGuardando(true); setError(null);
        try {
            await guardarAcceso({ identificador, rolId: Number(rolId), ...(!usuario ? { empleadoId: Number(empleadoId), password } : {}) }, usuario?.id);
            setPassword(''); onSaved();
        } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar el acceso.'); }
        finally { setGuardando(false); }
    }
    return <form className="card form-card" onSubmit={event => void guardar(event)}><h3>{usuario ? 'Editar acceso' : 'Crear usuario'}</h3>
        {error && <p className="notice error" role="alert">{error}</p>}
        {!usuario && <label>Empleado *<select required value={empleadoId} onChange={event => setEmpleadoId(event.target.value)}><option value="">Selecciona un empleado activo sin cuenta</option>{empleados.map(item => <option key={item.id} value={item.id}>{item.codEmpleado} · {item.persona.firstName} {item.persona.firstLastName}</option>)}</select></label>}
        {usuario && <p>{usuario.empleado.persona?.firstName} {usuario.empleado.persona?.firstLastName} · {usuario.empleado.codEmpleado}</p>}
        <label>Identificador *<input required minLength={3} maxLength={100} autoComplete="off" value={identificador} onChange={event => setIdentificador(event.target.value)} /></label>
        <label>Rol *<select required value={rolId} onChange={event => setRolId(event.target.value)}><option value="">Selecciona un rol</option>{roles.map(rol => <option key={rol.id} value={rol.id}>{rol.nombre} ({rol.cod})</option>)}</select></label>
        {!usuario && <label>Contraseña inicial *<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /><small>Mínimo 12 caracteres. Entrega la contraseña al usuario por el medio acordado.</small></label>}
        <div className="tk-form-actions"><Button type="button" disabled={guardando} onClick={onCancel}>Cancelar</Button><Button type="submit" loading={guardando} variant="primary">Guardar acceso</Button></div>
    </form>;
}
