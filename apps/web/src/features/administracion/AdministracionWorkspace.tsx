import UsuariosManager from './UsuariosManager';
import RolesPermisos from './RolesPermisos';
import { irA } from '../../shared/navigation';
import './administracion.css';

export default function AdministracionWorkspace({ ruta }: Readonly<{ ruta: string }>) {
    const seccion = ruta.split('/').filter(Boolean)[1] === 'roles' ? 'roles' : 'usuarios';
    return <section className="administracion-workspace" aria-label="Administración del sistema">
        <nav className="administracion-nav" aria-label="Opciones de administración">
            <button type="button" aria-current={seccion === 'usuarios' ? 'page' : undefined}
                onClick={() => irA('/administracion/usuarios')}>Gestión de usuarios</button>
            <button type="button" aria-current={seccion === 'roles' ? 'page' : undefined}
                onClick={() => irA('/administracion/roles')}>Roles y permisos</button>
        </nav>
        {seccion === 'usuarios' ? <UsuariosManager /> : <RolesPermisos />}
    </section>;
}
