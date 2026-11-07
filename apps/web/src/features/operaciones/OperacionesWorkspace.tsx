import Agenda from '../agenda/Agenda';
import OrdenesManager, { type VistaOrdenes } from '../ordenes/OrdenesManager';
import ServiciosManager from '../servicios/ServiciosManager';
import FieldWorkspace from '../field/FieldWorkspace';
import { ModuleHeader, type Miga } from '../erp-ui/components';
import { RUTAS } from '../../shared/navigation';
import { seccionesOperacion, type SeccionOperacion } from './operaciones.types';
import './operaciones.css';

const vistasOrdenes: Partial<Record<SeccionOperacion, VistaOrdenes>> = {
    solicitudes: 'solicitudes',
    diagnostico: 'diagnostico',
    ordenes: 'ordenes',
    ejecucion: 'ejecucion',
    evidencias: 'evidencias',
    despacho: 'despacho',
};

interface Props {
    ruta: string;
    puedeGestionar: boolean;
    onOrden: (id?: number) => void;
}

export default function OperacionesWorkspace({ ruta, puedeGestionar, onOrden }: Readonly<Props>) {
    const segmento = ruta.split('/').filter(Boolean)[1];
    const activa = seccionesOperacion.find(item => item.id === segmento) ?? seccionesOperacion[0];
    const vista = vistasOrdenes[activa.id];
    // Migas con enlace como en Comercial: Operaciones › Gestión operativa › sección.
    const migas: Miga[] = [{ label: 'Operaciones', ruta: RUTAS.operaciones.inicio }, { label: 'Gestión operativa', ruta: RUTAS.operaciones.solicitudes }, { label: activa.etiqueta }];

    return <section className="operaciones-scope" aria-label="Operaciones de servicio">
        <div className="operaciones-content">
            {vista && <OrdenesManager key={activa.id} puedeGestionar={puedeGestionar} vista={vista} migas={migas} />}
            {activa.id === 'tipos-servicio' && <><ModuleHeader breadcrumb={migas} title="Tipos de servicio" description="Catálogo de trabajos disponibles para las órdenes." /><ServiciosManager puedeGestionar={puedeGestionar} encabezado={false} /></>}
            {activa.id === 'agenda' && <><ModuleHeader breadcrumb={migas} title="Agenda" description="Visitas programadas por semana." /><Agenda onOrden={id => onOrden(id)} encabezado={false} /></>}
            {activa.id === 'field' && <FieldWorkspace ruta="/field/mis-ordenes" onOrden={id => onOrden(id)} />}
        </div>
    </section>;
}
