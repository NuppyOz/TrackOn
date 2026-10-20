import { ComercialModule } from './ComercialModule';
import { irA } from '../../shared/navigation';
import { seccionesComerciales } from './contracts';

export function ComercialWorkspace({ ruta, puedeAdministrar }: Readonly<{ ruta: string; puedeAdministrar: boolean }>) {
    const section = seccionesComerciales.find(item => item.id === ruta.split('/')[2])?.id ?? 'crm';
    if (section === 'portal-cuentas' && !puedeAdministrar) return <p role="alert">Solo un administrador puede gestionar el acceso al portal.</p>;
    return <ComercialModule section={section} onNavigate={destino => irA(`/comercial/${destino}`)} />;
}
