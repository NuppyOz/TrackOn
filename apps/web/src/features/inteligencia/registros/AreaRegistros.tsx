import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { irA } from '../../../shared/navigation';
import { ContratosFuentesPage } from '../../fuentes-gerenciales/contratos';
import { ComprobantesPage } from '../../fuentes-gerenciales/finanzas/documentos';
import { FacturablesPage } from '../../fuentes-gerenciales/finanzas/facturables';
import { CobrosPage } from '../../fuentes-gerenciales/finanzas/cobros';
import { CostosPage } from '../../fuentes-gerenciales/finanzas/costos';
import { ArticulosPage } from '../../fuentes-gerenciales/logistica/articulos';
import { MovimientosPage } from '../../fuentes-gerenciales/logistica/movimientos';
import { ComprasGerencialesPage } from '../../fuentes-gerenciales/logistica/compras';
import { HerramientasGerencialesPage } from '../../fuentes-gerenciales/logistica/herramientas';
import { GarantiasGerencialesPage } from '../../fuentes-gerenciales/calidad/garantias';
import { CasosCalidadPage } from '../../fuentes-gerenciales/calidad/casos';
import { CorrectivasGerencialesPage } from '../../fuentes-gerenciales/calidad/correctivas';

export type AreaRegistrosId = 'comercial' | 'financiero' | 'logistico' | 'calidad';

type Fuente = { id: string; etiqueta: string; render: (onBusyChange: (busy: boolean) => void) => ReactNode };

/**
 * Las fuentes de registro no son navegación: son un filtro de la misma pantalla.
 * Elegir «Cobros» en vez de «Comprobantes» cambia la tabla y queda en la URL
 * (`?fuente=cobros`), así que el enlace se puede compartir y el botón atrás
 * vuelve a la fuente anterior.
 */
const fuentes: Record<AreaRegistrosId, Fuente[]> = {
    comercial: [
        { id: 'contratos', etiqueta: 'Contratos', render: () => <ContratosFuentesPage /> },
    ],
    financiero: [
        { id: 'comprobantes', etiqueta: 'Comprobantes', render: onBusy => <ComprobantesPage onBusyChange={onBusy} /> },
        { id: 'servicios', etiqueta: 'Servicios realizados', render: onBusy => <FacturablesPage onBusyChange={onBusy} /> },
        { id: 'cobros', etiqueta: 'Cobros', render: onBusy => <CobrosPage onBusyChange={onBusy} /> },
        { id: 'costos', etiqueta: 'Costos', render: onBusy => <CostosPage onBusyChange={onBusy} /> },
    ],
    logistico: [
        { id: 'articulos', etiqueta: 'Artículos', render: onBusy => <ArticulosPage onBusyChange={onBusy} /> },
        { id: 'movimientos', etiqueta: 'Movimientos', render: onBusy => <MovimientosPage onBusyChange={onBusy} /> },
        { id: 'compras', etiqueta: 'Compras', render: onBusy => <ComprasGerencialesPage onBusyChange={onBusy} /> },
        { id: 'herramientas', etiqueta: 'Herramientas', render: onBusy => <HerramientasGerencialesPage onBusyChange={onBusy} /> },
    ],
    calidad: [
        { id: 'garantias', etiqueta: 'Garantías', render: onBusy => <GarantiasGerencialesPage onBusyChange={onBusy} /> },
        { id: 'casos', etiqueta: 'Reclamos y calidad', render: onBusy => <CasosCalidadPage onBusyChange={onBusy} /> },
        { id: 'correctivas', etiqueta: 'Acciones correctivas', render: onBusy => <CorrectivasGerencialesPage onBusyChange={onBusy} /> },
    ],
};

const leerFuente = (area: AreaRegistrosId) => {
    const pedida = new URLSearchParams(window.location.search).get('fuente');
    return fuentes[area].some(fuente => fuente.id === pedida) ? (pedida as string) : fuentes[area][0].id;
};

export function AreaRegistros({ area }: Readonly<{ area: AreaRegistrosId }>) {
    const [fuente, setFuente] = useState(() => leerFuente(area));
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const sincronizar = () => setFuente(leerFuente(area));
        window.addEventListener('trackon:navigate', sincronizar);
        window.addEventListener('popstate', sincronizar);
        return () => {
            window.removeEventListener('trackon:navigate', sincronizar);
            window.removeEventListener('popstate', sincronizar);
        };
    }, [area]);

    const opciones = fuentes[area];
    const activa = opciones.find(opcion => opcion.id === fuente) ?? opciones[0];

    return <div className="fuentes-scope">
        {opciones.length > 1 && (
            <div className="fuente-chips" role="group" aria-label={`Fuente de los registros de ${area}`}>
                <span className="fuente-chips__label">Fuente</span>
                {opciones.map(opcion => (
                    <button
                        key={opcion.id}
                        type="button"
                        aria-pressed={opcion.id === activa.id}
                        onClick={() => { if (opcion.id !== activa.id) irA(`/inteligencia/${area}/registros?fuente=${opcion.id}`); }}
                    >
                        {opcion.etiqueta}
                    </button>
                ))}
            </div>
        )}
        {activa.render(setBusy)}
        {busy && <p role="status" className="fuente-chips__busy">Guardando…</p>}
    </div>;
}
