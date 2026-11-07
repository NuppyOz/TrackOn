import { ComercialModule } from './ComercialModule';
import { RUTAS } from '../../shared/navigation';
import { seccionesComerciales } from './contracts';
import { CrmPage } from './crm/CrmPage';
import { TarifasPage } from './tarifas/TarifasPage';
import { CotizacionesPage } from './cotizaciones/CotizacionesPage';
import { PortalCuentasPage } from './portal-cuentas/PortalCuentasPage';

export function ComercialWorkspace({ ruta, puedeAdministrar }: Readonly<{ ruta: string; puedeAdministrar: boolean }>) {
    const section = seccionesComerciales.find(item => RUTAS.comercial[item.id] === ruta)
        ?? (ruta === RUTAS.comercial.inicio ? seccionesComerciales[0] : undefined);
    if (!section) return <p role="alert">La ruta comercial solicitada no existe.</p>;
    if (section.id === 'portal-cuentas' && !puedeAdministrar) return <p role="alert">Solo un administrador puede gestionar el acceso al portal.</p>;
    return <ComercialModule section={section.id} showHeading={false}>
        {section.id === 'crm' ? <CrmPage /> : section.id === 'catalogo-tarifas' ? <TarifasPage /> : section.id === 'cotizaciones-ventas' ? <CotizacionesPage /> : section.id === 'portal-cuentas' ? <PortalCuentasPage puedeGestionar={puedeAdministrar} /> : undefined}
    </ComercialModule>;
}
