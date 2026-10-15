import type { EmpleadoDetalle } from './empleados.types';
import { nombreEmpleado } from './empleados.types';

interface Props {
    empleado: EmpleadoDetalle;
    ocupada: boolean;
    onEditar: () => void;
    onCambiarEstado: () => void;
    onCambiarHabilitacion: () => void;
}

function valor(texto?: string | null) { return texto || 'No registrado'; }

export default function EmpleadoDetallePanel({ empleado, ocupada, onEditar, onCambiarEstado, onCambiarHabilitacion }: Readonly<Props>) {
    const campos = [
        ['Código de empleado', empleado.codEmpleado],
        ['Nombre completo', nombreEmpleado(empleado)],
        ['Tipo de documento', empleado.persona.typeDocument],
        ['Número de documento', empleado.persona.numberDocument],
        ['Teléfono', empleado.persona.telephone],
        ['Correo electrónico', empleado.persona.correo],
    ];
    return <div className="tk-employee-panel tk-employee-detail">
        <div className="tk-employee-detail-header">
            <div><h3>{nombreEmpleado(empleado)}</h3><p>{empleado.codEmpleado}</p></div>
            <span className={`tk-employee-pill ${empleado.active ? 'is-active' : 'is-inactive'}`}>{empleado.active ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div className="tk-employee-detail-grid">{campos.map(([etiqueta, contenido]) =>
            <div key={etiqueta}><span>{etiqueta}</span><strong>{valor(contenido)}</strong></div>)}</div>
        <div className="tk-employee-tech-box">
            <div><strong>Habilitación técnica</strong><p>Permite que el empleado sea considerado para funciones técnicas y asignaciones.</p>
                <span className={`tk-employee-pill ${empleado.habilitadoComoTecnico ? 'is-tech' : 'is-neutral'}`}>
                    {empleado.habilitadoComoTecnico ? 'Habilitado' : 'No habilitado'}
                </span>
            </div>
            <button type="button" className="tk-employee-secondary" disabled={ocupada || (!empleado.active && !empleado.habilitadoComoTecnico)} onClick={onCambiarHabilitacion}>
                {empleado.habilitadoComoTecnico ? 'Retirar habilitación' : 'Habilitar como técnico'}
            </button>
        </div>
        <div className="tk-employee-detail-actions">
            <button type="button" className="tk-employee-primary" disabled={ocupada} onClick={onEditar}>Editar empleado</button>
            <button type="button" className="tk-employee-secondary" disabled={ocupada} onClick={onCambiarEstado}>
                {empleado.active ? 'Desactivar empleado' : 'Reactivar empleado'}
            </button>
        </div>
    </div>;
}
