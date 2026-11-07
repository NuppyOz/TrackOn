import type { OrdenResumen } from './ordenes.types';
import { permiteAccionOrden, type AccionOrden } from './ordenes.acciones';
import { RowActions } from '../../shared/ui';
import { CircleOff, Eye, Pencil, UserRoundPlus, type LucideIcon } from 'lucide-react';

const acciones: ReadonlyArray<{ tipo: AccionOrden; etiqueta: string; ayuda: string; icono: LucideIcon }> = [
    { tipo: 'ver', etiqueta: 'Ver', ayuda: 'Ver el resumen y el trabajo de la orden', icono: Eye },
    { tipo: 'editar', etiqueta: 'Editar', ayuda: 'Editar solicitud, prioridad y fecha', icono: Pencil },
    { tipo: 'asignar', etiqueta: 'Asignar', ayuda: 'Elegir la cuadrilla responsable', icono: UserRoundPlus },
    { tipo: 'desactivar', etiqueta: 'Desactivar', ayuda: 'Cancelar la orden indicando un motivo', icono: CircleOff },
] as const;

export default function OrdenAcciones({ orden, puedeGestionar, onAction }: Readonly<{
    orden: OrdenResumen; puedeGestionar: boolean; onAction: (accion: AccionOrden) => void;
}>) {
    return <RowActions className="tk-order-actions" label={`Acciones de OT-${orden.numero}`}>
        {acciones.filter(accion => puedeGestionar || accion.tipo === 'ver').map(accion => {
            const Icono = accion.icono;
            const habilitada = permiteAccionOrden(orden.estadoCodigo, puedeGestionar, accion.tipo);
            const ayuda = habilitada ? accion.ayuda : accion.tipo === 'asignar'
                ? 'Solo puedes asignar órdenes pendientes.' : 'La orden está en revisión o finalizada.';
            return <button key={accion.tipo} type="button" className={`tk-order-icon-action tk-order-icon-action--${accion.tipo}`}
                aria-label={`${accion.etiqueta} OT-${orden.numero}`} title={ayuda} disabled={!habilitada}
                onClick={() => onAction(accion.tipo)}>
                <Icono aria-hidden="true" size={15} strokeWidth={1.8} /><span>{accion.etiqueta}</span>
            </button>;
        })}
    </RowActions>;
}
