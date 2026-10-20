import { ComercialModule } from './ComercialModule';
import { irA } from '../../shared/navigation';
import { seccionesComerciales } from './contracts';
import { CrmPage } from './crm/CrmPage';
import { TarifasPage } from './tarifas/TarifasPage';
import { CotizacionesPage } from './cotizaciones/CotizacionesPage';
import { PortalCuentasPage } from './portal-cuentas/PortalCuentasPage';

export function ComercialWorkspace({ ruta, puedeAdministrar }: Readonly<{ ruta: string; puedeAdministrar: boolean }>) {
    const section = seccionesComerciales.find(item => item.id === ruta.split('/')[2])?.id ?? 'crm';
    if (section === 'portal-cuentas' && !puedeAdministrar) return <p role="alert">Solo un administrador puede gestionar el acceso al portal.</p>;
    return <ComercialModule section={section} availableSections={puedeAdministrar ? ['crm', 'catalogo-tarifas', 'cotizaciones-ventas', 'portal-cuentas'] : ['crm', 'catalogo-tarifas', 'cotizaciones-ventas']} showHeading={false} onNavigate={destino => irA(`/comercial/${destino}`)}>
        {section === 'crm' ? <CrmPage /> : section === 'catalogo-tarifas' ? <TarifasPage /> : section === 'cotizaciones-ventas' ? <CotizacionesPage /> : section === 'portal-cuentas' ? <PortalCuentasPage puedeGestionar={puedeAdministrar} /> : undefined}
    </ComercialModule>;
}
