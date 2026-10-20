import { InteligenciaModule } from './InteligenciaModule';
import { irA } from '../../shared/navigation';
import { seccionesInteligencia, type SeccionInteligencia } from './contracts';
import { FuentesGerencialesModule } from '../fuentes-gerenciales';
import { seccionesFuentesGerenciales, type SeccionFuenteGerencial } from '../fuentes-gerenciales/contracts';
import { CoberturaPage } from '../fuentes-gerenciales/procedencia/CoberturaPage';
import { ContratosFuentesPage } from '../fuentes-gerenciales/contratos/ContratosFuentesPage';
import { IndicadoresComercialesPage } from './comercial/IndicadoresComercialesPage';
import './InteligenciaWorkspace.css';

const origenPorTablero: Record<SeccionInteligencia, SeccionFuenteGerencial> = {
    comercial: 'contratos', financiero: 'finanzas', logistico: 'logistica', calidad: 'calidad',
};
const tableroPorOrigen: Record<SeccionFuenteGerencial, SeccionInteligencia> = {
    contratos: 'comercial', finanzas: 'financiero', logistica: 'logistico', calidad: 'calidad',
};

export function InteligenciaWorkspace({ ruta }: Readonly<{ ruta: string }>) {
    const segmentos = ruta.split('/');
    const esOrigen = segmentos[2] === 'origen';
    const esCobertura = segmentos[2] === 'cobertura';
    const origen = seccionesFuentesGerenciales.find(item => item.id === segmentos[3])?.id ?? 'contratos';
    const section = seccionesInteligencia.find(item => item.id === segmentos[2])?.id ?? 'comercial';
    const tablero = esOrigen ? tableroPorOrigen[origen] : section;
    return <div className="inteligencia-scope inteligencia-workspace">
        <nav className="inteligencia-workspace__nav" aria-label="Indicadores y registros">
            <button type="button" aria-current={!esOrigen && !esCobertura ? 'page' : undefined} onClick={() => irA(`/inteligencia/${tablero}`)}>Indicadores</button>
            <button type="button" aria-current={esOrigen ? 'page' : undefined} onClick={() => irA(`/inteligencia/origen/${origenPorTablero[tablero]}`)}>Registros de origen</button>
            <button type="button" aria-current={esCobertura ? 'page' : undefined} onClick={() => irA('/inteligencia/cobertura')}>Cobertura de los datos</button>
        </nav>
        {esCobertura ? <CoberturaPage /> : esOrigen ? <FuentesGerencialesModule section={origen} showHeading={false} availableSections={['contratos']} onNavigate={destino => irA(`/inteligencia/origen/${destino}`)}>
            {origen === 'contratos' ? <ContratosFuentesPage /> : undefined}
        </FuentesGerencialesModule> : <InteligenciaModule section={section} showHeading={false} availableSections={['comercial']} onNavigate={destino => irA(`/inteligencia/${destino}`)}>
            {section === 'comercial' ? <IndicadoresComercialesPage /> : undefined}
        </InteligenciaModule>}
    </div>;
}
