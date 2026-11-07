import UsuariosManager from './UsuariosManager';
import RolesPermisos from './RolesPermisos';
import { irA } from '../../shared/navigation';
import { SectionSelector } from '../erp-ui/components';
import './administracion.css';

export default function AdministracionWorkspace({ ruta }: Readonly<{ ruta: string }>) {
    const seccion = ruta.split('/').filter(Boolean)[1] === 'roles' ? 'roles' : 'usuarios';
    return <section className="administracion-workspace" aria-label="Administración del sistema">
        <SectionSelector label="Configuración" value={seccion} onChange={value => irA(`/administracion/${value}`)} options={[
            { value: 'usuarios', label: 'Usuarios' }, { value: 'roles', label: 'Roles y permisos' },
        ]} />
        {seccion === 'usuarios' ? <UsuariosManager /> : <RolesPermisos />}
    </section>;
}
