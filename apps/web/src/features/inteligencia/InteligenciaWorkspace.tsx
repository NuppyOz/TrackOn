import { InteligenciaModule } from './InteligenciaModule';
import { irA } from '../../shared/navigation';
import { seccionesInteligencia } from './contracts';
import { FuentesGerencialesModule } from '../fuentes-gerenciales';
import { seccionesFuentesGerenciales } from '../fuentes-gerenciales/contracts';

export function InteligenciaWorkspace({ ruta }: Readonly<{ ruta: string }>) {
    const segmentos = ruta.split('/');
    if (segmentos[2] === 'origen') {
        const section = seccionesFuentesGerenciales.find(item => item.id === segmentos[3])?.id ?? 'contratos';
        return <FuentesGerencialesModule section={section} onNavigate={destino => irA(`/inteligencia/origen/${destino}`)} />;
    }
    const section = seccionesInteligencia.find(item => item.id === segmentos[2])?.id ?? 'comercial';
    return <InteligenciaModule section={section} onNavigate={destino => irA(`/inteligencia/${destino}`)} />;
}
