import type { OrdenResumen } from './ordenes.types';
import { permiteAccionOrden, type AccionOrden } from './ordenes.acciones';

const acciones = [
    { tipo: 'ver', etiqueta: 'Ver', ayuda: 'Ver el resumen y el trabajo de la orden' },
    { tipo: 'editar', etiqueta: 'Editar', ayuda: 'Editar solicitud, prioridad y fecha' },
    { tipo: 'asignar', etiqueta: 'Asignar', ayuda: 'Elegir la cuadrilla responsable' },
    { tipo: 'desactivar', etiqueta: 'Desactivar', ayuda: 'Cancelar la orden indicando un motivo' },
] as const;

function Icono({ accion }: Readonly<{ accion: AccionOrden }>) {
    return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {accion === 'ver' && <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
        {accion === 'editar' && <><path d="m16 3 5 5M4 20l4.5-1L21 6.5 17.5 3 5 15.5 4 20ZM13 5H4a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-9" /></>}
        {accion === 'asignar' && <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M19 8v6M16 11h6" /></>}
        {accion === 'desactivar' && <><path d="M12 2v10M5.6 5.6a9 9 0 1 0 12.8 0" /></>}
    </svg>;
}

export default function OrdenAcciones({ orden, puedeGestionar, onAction }: Readonly<{
    orden: OrdenResumen; puedeGestionar: boolean; onAction: (accion: AccionOrden) => void;
}>) {
    return <div className="tk-order-actions" role="group" aria-label={`Acciones de OT-${orden.numero}`}>
        {acciones.filter(accion => puedeGestionar || accion.tipo === 'ver').map(accion => {
            const habilitada = permiteAccionOrden(orden.estadoCodigo, puedeGestionar, accion.tipo);
            const ayuda = habilitada ? accion.ayuda : accion.tipo === 'asignar'
                ? 'Solo puedes asignar órdenes pendientes.' : 'La orden está en revisión o finalizada.';
            return <button key={accion.tipo} type="button" className={`tk-order-icon-action tk-order-icon-action--${accion.tipo}`}
                aria-label={`${accion.etiqueta} OT-${orden.numero}`} title={ayuda} disabled={!habilitada}
                onClick={() => onAction(accion.tipo)}>
                <Icono accion={accion.tipo} /><span>{accion.etiqueta}</span>
            </button>;
        })}
    </div>;
}
