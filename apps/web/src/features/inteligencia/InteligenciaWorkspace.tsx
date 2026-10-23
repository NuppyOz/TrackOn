import { InteligenciaModule } from './InteligenciaModule';
import { irA } from '../../shared/navigation';
import { seccionesInteligencia, type SeccionInteligencia } from './contracts';
import { FuentesGerencialesModule } from '../fuentes-gerenciales';
import { seccionesFuentesGerenciales, type SeccionFuenteGerencial } from '../fuentes-gerenciales/contracts';
import { CoberturaPage } from '../fuentes-gerenciales/procedencia/CoberturaPage';
import { ContratosFuentesPage } from '../fuentes-gerenciales/contratos/ContratosFuentesPage';
import { IndicadoresComercialesPage } from './comercial/IndicadoresComercialesPage';
import { FinanzasFuentesPage } from '../fuentes-gerenciales/finanzas/FinanzasFuentesPage';
import { IndicadoresFinancierosPage } from './financiero';
import { LogisticaFuentesPage } from '../fuentes-gerenciales/logistica/LogisticaFuentesPage';
import { IndicadoresLogisticosPage } from './logistico';
import { CalidadFuentesPage } from '../fuentes-gerenciales/calidad/CalidadFuentesPage';
import { IndicadoresCalidadPage } from './calidad';
import './InteligenciaWorkspace.css';
import OperacionInteligentePage from './operativo/OperacionInteligentePage';

const origenPorTablero: Record<SeccionInteligencia, SeccionFuenteGerencial> = {
    comercial: 'contratos', financiero: 'finanzas', logistico: 'logistica', calidad: 'calidad',
};
const tableroPorOrigen: Record<SeccionFuenteGerencial, SeccionInteligencia> = {
    contratos: 'comercial', finanzas: 'financiero', logistica: 'logistico', calidad: 'calidad',
};

export function InteligenciaWorkspace({ ruta, onOrden }: Readonly<{ ruta: string; onOrden?: (id: number) => void }>) {
    const segmentos = ruta.split('/');
    const esOperacion = !segmentos[2] || segmentos[2] === 'operacion';
    const esOrigen = segmentos[2] === 'origen';
    const esCobertura = segmentos[2] === 'cobertura';
    const origen = seccionesFuentesGerenciales.find(item => item.id === segmentos[3])?.id ?? 'contratos';
    const section = seccionesInteligencia.find(item => item.id === segmentos[2])?.id ?? 'comercial';
    const tablero = esOrigen ? tableroPorOrigen[origen] : section;
    return <div className="inteligencia-scope inteligencia-workspace">
        <nav className="inteligencia-workspace__nav" aria-label="Indicadores y registros">
            <button type="button" aria-current={esOperacion ? 'page' : undefined} onClick={() => irA('/inteligencia/operacion/resumen')}>Operación</button>
            <button type="button" aria-current={!esOperacion && !esOrigen && !esCobertura ? 'page' : undefined} onClick={() => irA(`/inteligencia/${tablero}`)}>Indicadores de negocio</button>
            <button type="button" aria-current={esOrigen ? 'page' : undefined} onClick={() => irA(`/inteligencia/origen/${origenPorTablero[tablero]}`)}>Registros de origen</button>
            <button type="button" aria-current={esCobertura ? 'page' : undefined} onClick={() => irA('/inteligencia/cobertura')}>Cobertura de los datos</button>
        </nav>
        {esOperacion ? <OperacionInteligentePage ruta={ruta} onOrden={onOrden ?? (() => undefined)} /> : esCobertura ? <CoberturaPage /> : esOrigen ? <FuentesGerencialesModule section={origen} showHeading={false} availableSections={['contratos', 'finanzas', 'logistica', 'calidad']} onNavigate={destino => irA(`/inteligencia/origen/${destino}`)}>
            {origen === 'contratos' ? <ContratosFuentesPage /> : origen === 'finanzas' ? <FinanzasFuentesPage /> : origen === 'logistica' ? <LogisticaFuentesPage /> : <CalidadFuentesPage />}
        </FuentesGerencialesModule> : <InteligenciaModule section={section} showHeading={false} availableSections={['comercial', 'financiero', 'logistico', 'calidad']} onNavigate={destino => irA(`/inteligencia/${destino}`)}>
            {section === 'comercial' ? <IndicadoresComercialesPage /> : section === 'financiero' ? <IndicadoresFinancierosPage /> : section === 'logistico' ? <IndicadoresLogisticosPage /> : <IndicadoresCalidadPage />}
        </InteligenciaModule>}
    </div>;
}
