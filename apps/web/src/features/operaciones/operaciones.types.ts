export type SeccionOperacion =
    | 'solicitudes'
    | 'diagnostico'
    | 'ordenes'
    | 'tipos-servicio'
    | 'ejecucion'
    | 'evidencias'
    | 'agenda'
    | 'despacho'
    | 'field';

export const seccionesOperacion: ReadonlyArray<{
    id: SeccionOperacion;
    codigo: string;
    etiqueta: string;
}> = [
    { id: 'solicitudes', codigo: 'B.1', etiqueta: 'Solicitudes de servicio' },
    { id: 'diagnostico', codigo: 'B.2', etiqueta: 'Diagnóstico técnico' },
    { id: 'ordenes', codigo: 'B.3', etiqueta: 'Órdenes de trabajo' },
    { id: 'tipos-servicio', codigo: 'B.4', etiqueta: 'Tipos de servicio' },
    { id: 'ejecucion', codigo: 'B.5', etiqueta: 'Ejecución técnica' },
    { id: 'evidencias', codigo: 'B.6', etiqueta: 'Evidencias del servicio' },
    { id: 'agenda', codigo: 'B.7', etiqueta: 'Agenda y planificación' },
    { id: 'despacho', codigo: 'B.8', etiqueta: 'Despacho y asignación' },
    { id: 'field', codigo: 'B.9', etiqueta: 'TrackOn Field' },
];
