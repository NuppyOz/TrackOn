import type { ReactNode } from 'react';
import { ComercialModule } from './ComercialModule';
import { RUTAS } from '../../shared/navigation';
import type { SeccionComercial } from './contracts';
import { CrmPage, type TabCrm } from './crm/CrmPage';
import { TarifasPage } from './tarifas/TarifasPage';
import { CotizacionesPage } from './cotizaciones/CotizacionesPage';
import { PortalCuentasPage } from './portal-cuentas/PortalCuentasPage';
import ClientesManager from '../clientes/ClientesManager';

const C = RUTAS.comercial;
const tabsCrm: Record<string, TabCrm> = {
    [C['crm-contactos']]: 'contactos', [C['crm-ubicaciones']]: 'ubicaciones',
};

/** Cada sub-opción del sidebar comercial abre la página con su sección ya seleccionada. */
function resolver(ruta: string, puedeAdministrar: boolean): { section: SeccionComercial; vista: ReactNode } | undefined {
    const clienteId = /^\/comercial\/crm\/([1-9]\d*)$/.exec(ruta)?.[1];
    if (clienteId) return { section: 'crm', vista: <CrmPage key={ruta} clienteInicial={Number(clienteId)} /> };
    if (ruta === C.inicio || ruta === C.crm) return { section: 'crm', vista: <CrmPage key={ruta} /> };
    if (ruta === C['crm-nuevo']) return { section: 'crm', vista: <ClientesManager puedeGestionar rutaBase={C.crm} /> };
    if (ruta in tabsCrm) return { section: 'crm', vista: <CrmPage key={ruta} tabInicial={tabsCrm[ruta]} /> };
    if (ruta === C.ventas || ruta === C['ventas-cotizaciones']) return { section: 'ventas', vista: <CotizacionesPage key={ruta} seccion="cotizaciones" /> };
    if (ruta === C['ventas-oportunidades']) return { section: 'ventas', vista: <CotizacionesPage key={ruta} seccion="oportunidades" /> };
    if (ruta === C['ventas-registradas']) return { section: 'ventas', vista: <CotizacionesPage key={ruta} seccion="ventas" /> };
    if (ruta === C.catalogo || ruta === C['catalogo-conceptos']) return { section: 'catalogo', vista: <TarifasPage key={ruta} seccion="conceptos" /> };
    if (ruta === C['catalogo-tarifas']) return { section: 'catalogo', vista: <TarifasPage key={ruta} seccion="tarifas" /> };
    if (ruta === C['portal-cuentas']) return { section: 'portal-cuentas', vista: <PortalCuentasPage puedeGestionar={puedeAdministrar} /> };
    return undefined;
}

export function ComercialWorkspace({ ruta, puedeAdministrar }: Readonly<{ ruta: string; puedeAdministrar: boolean }>) {
    const resultado = resolver(ruta, puedeAdministrar);
    if (!resultado) return <p role="alert">La ruta comercial solicitada no existe.</p>;
    if (resultado.section === 'portal-cuentas' && !puedeAdministrar) return <p role="alert">Solo un administrador puede gestionar el acceso al portal.</p>;
    return <ComercialModule section={resultado.section} showHeading={false}>{resultado.vista}</ComercialModule>;
}
