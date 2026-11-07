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
import { SectionSelector } from '../erp-ui/components';

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
    const categoria = esOperacion ? 'operacion' : esOrigen ? 'origen' : esCobertura ? 'cobertura' : 'indicadores';
    return <div className="inteligencia-scope inteligencia-workspace">
        <SectionSelector label="Área" value={categoria} options={[
            { value: 'operacion', label: 'Operación' },
            { value: 'indicadores', label: 'Indicadores de negocio' },
            { value: 'origen', label: 'Registros de origen' },
            { value: 'cobertura', label: 'Cobertura de datos' },
        ]} onChange={value => {
            if (value === 'operacion') irA('/inteligencia/operacion/resumen');
            else if (value === 'indicadores') irA(`/inteligencia/${tablero}`);
            else if (value === 'origen') irA(`/inteligencia/origen/${origenPorTablero[tablero]}`);
            else irA('/inteligencia/cobertura');
        }} />
        {esOperacion ? <OperacionInteligentePage ruta={ruta} onOrden={onOrden ?? (() => undefined)} /> : esCobertura ? <CoberturaPage /> : esOrigen ? <FuentesGerencialesModule section={origen} showHeading={false} availableSections={['contratos', 'finanzas', 'logistica', 'calidad']} onNavigate={destino => irA(`/inteligencia/origen/${destino}`)}>
            {origen === 'contratos' ? <ContratosFuentesPage /> : origen === 'finanzas' ? <FinanzasFuentesPage /> : origen === 'logistica' ? <LogisticaFuentesPage /> : <CalidadFuentesPage />}
        </FuentesGerencialesModule> : <InteligenciaModule section={section} showHeading={false} availableSections={['comercial', 'financiero', 'logistico', 'calidad']} onNavigate={destino => irA(`/inteligencia/${destino}`)}>
            {section === 'comercial' ? <IndicadoresComercialesPage /> : section === 'financiero' ? <IndicadoresFinancierosPage /> : section === 'logistico' ? <IndicadoresLogisticosPage /> : <IndicadoresCalidadPage />}
        </InteligenciaModule>}
    </div>;
}
