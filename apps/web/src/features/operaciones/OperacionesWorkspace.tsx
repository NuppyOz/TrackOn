import Agenda from '../agenda/Agenda';
import OrdenesManager, { type VistaOrdenes } from '../ordenes/OrdenesManager';
import ServiciosManager from '../servicios/ServiciosManager';
import FieldWorkspace from '../field/FieldWorkspace';
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
    const seccion = seccionesOperacion.find(item => item.id === segmento)?.id ?? 'solicitudes';
    const vista = vistasOrdenes[seccion];

    return <section className="operaciones-scope" aria-label="Operaciones de servicio">
        <div className="operaciones-content">
            {vista && <OrdenesManager key={seccion} puedeGestionar={puedeGestionar} vista={vista} />}
            {seccion === 'tipos-servicio' && <ServiciosManager puedeGestionar={puedeGestionar} />}
            {seccion === 'agenda' && <Agenda onOrden={id => onOrden(id)} />}
            {seccion === 'field' && <FieldWorkspace ruta="/field/mis-ordenes" onOrden={id => onOrden(id)} />}
        </div>
    </section>;
}
