import type { ReactNode } from 'react';
import { irA } from '../../shared/navigation';
import { CoberturaPage } from '../fuentes-gerenciales/procedencia/CoberturaPage';
import { AreaRegistros, type AreaRegistrosId } from './registros/AreaRegistros';
import { IndicadoresComercialesPage } from './comercial';
import { IndicadoresFinancierosPage } from './financiero';
import { IndicadoresLogisticosPage } from './logistico';
import { IndicadoresCalidadPage } from './calidad';
import './InteligenciaWorkspace.css';

/**
 * Inteligencia tiene una sola fila de navegación: el área la elige el menú
 * lateral y aquí sólo se alterna entre el tablero y sus registros. La cobertura
 * de los datos es una página de consulta, no una pestaña más: se llega desde el
 * enlace del extremo derecho de la fila.
 */
const areas: Record<AreaRegistrosId, { label: string; tablero: () => ReactNode }> = {
    comercial: { label: 'Comercial', tablero: () => <IndicadoresComercialesPage /> },
    financiero: { label: 'Financiero', tablero: () => <IndicadoresFinancierosPage /> },
    logistico: { label: 'Logístico', tablero: () => <IndicadoresLogisticosPage /> },
    calidad: { label: 'Calidad', tablero: () => <IndicadoresCalidadPage /> },
};

export function InteligenciaWorkspace({ ruta }: Readonly<{ ruta: string }>) {
    const segmentos = ruta.split('/').filter(Boolean);
    if (segmentos[1] === 'cobertura') return <CoberturaPage />;

    const area: AreaRegistrosId = segmentos[1] && segmentos[1] in areas ? (segmentos[1] as AreaRegistrosId) : 'comercial';
    const vista = segmentos[2] === 'registros' ? 'registros' : 'tablero';
    const Tablero = areas[area].tablero;

    return <div className="inteligencia-scope inteligencia-workspace">
        <nav className="inteligencia-workspace__nav" aria-label={`${areas[area].label}: tablero y registros`}>
            <button
                type="button"
                aria-current={vista === 'tablero' ? 'page' : undefined}
                onClick={() => irA(`/inteligencia/${area}`)}
            >
                Tablero
            </button>
            <button
                type="button"
                aria-current={vista === 'registros' ? 'page' : undefined}
                onClick={() => irA(`/inteligencia/${area}/registros`)}
            >
                Registros
            </button>
            <a
                className="inteligencia-workspace__cobertura"
                href="/inteligencia/cobertura"
                onClick={event => { event.preventDefault(); irA('/inteligencia/cobertura'); }}
            >
                Cobertura de los datos
            </a>
        </nav>
        <section aria-live="polite">
            {vista === 'tablero' ? <Tablero /> : <AreaRegistros area={area} />}
        </section>
    </div>;
}
