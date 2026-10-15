import { useState, type FormEvent } from 'react';
import { construirActualizacion, construirEmpleado, datosDesdeEmpleado, validarFormularioEmpleado, type DatosFormularioEmpleado } from './empleados.form';
import type { CrearEmpleado, EditarEmpleado, EmpleadoDetalle, TipoDocumento } from './empleados.types';

interface Props {
    empleado: EmpleadoDetalle | null;
    guardando: boolean;
    onGuardar: (datos: CrearEmpleado | EditarEmpleado) => Promise<void>;
    onCancelar: () => void;
}

type Campo = keyof DatosFormularioEmpleado;
const nombresDocumento: { value: TipoDocumento; label: string }[] = [
    { value: 'CEDULA_NIC', label: 'Cédula nicaragüense' },
    { value: 'CEDULA_RESIDENCIA', label: 'Cédula de residencia' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function EmpleadoFormulario({ empleado, guardando, onGuardar, onCancelar }: Readonly<Props>) {
    const [datos, setDatos] = useState(() => datosDesdeEmpleado(empleado));
    const [error, setError] = useState<string | null>(null);

    function actualizar(campo: Campo, valor: string) {
        setDatos(actual => ({ ...actual, [campo]: valor }));
        setError(null);
    }

    async function guardar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const mensaje = validarFormularioEmpleado(datos);
        if (mensaje) { setError(mensaje); return; }
        await onGuardar(empleado ? construirActualizacion(datos) : construirEmpleado(datos));
    }

    const campoTexto = (id: Campo, etiqueta: string, obligatorio = false, maxLength = 100) => (
        <label className="tk-employee-field" htmlFor={`empleado-${id}`} key={id}>
            <span>{etiqueta}{obligatorio ? ' *' : ''}</span>
            <input id={`empleado-${id}`} value={datos[id]} maxLength={maxLength}
                onChange={event => actualizar(id, event.target.value)} required={obligatorio}
                autoComplete="off" />
        </label>
    );

    return <section className="tk-employee-panel" aria-labelledby="empleado-form-titulo">
        <div className="tk-employee-panel-heading">
            <div><h3 id="empleado-form-titulo">{empleado ? 'Editar empleado' : 'Registrar empleado'}</h3>
                <p>Los datos de personal son independientes de las cuentas de acceso.</p></div>
        </div>
        <form onSubmit={event => void guardar(event)} noValidate>
            <h4>Información laboral</h4>
            <div className="tk-employee-form-grid">
                {campoTexto('codEmpleado', 'Código de empleado', true, 30)}
            </div>
            <h4>Datos personales</h4>
            <div className="tk-employee-form-grid">
                {campoTexto('firstName', 'Primer nombre', true)}
                {campoTexto('secondName', 'Segundo nombre')}
                {campoTexto('firstLastName', 'Primer apellido', true)}
                {campoTexto('secondLastName', 'Segundo apellido')}
                <label className="tk-employee-field" htmlFor="empleado-typeDocument">
                    <span>Tipo de documento</span>
                    <select id="empleado-typeDocument" value={datos.typeDocument}
                        onChange={event => actualizar('typeDocument', event.target.value)}>
                        <option value="">Sin documento</option>
                        {nombresDocumento.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                {campoTexto('numberDocument', 'Número de documento', false, 50)}
            </div>
            <h4>Contacto</h4>
            <div className="tk-employee-form-grid">
                {campoTexto('telephone', 'Teléfono', false, 25)}
                <label className="tk-employee-field" htmlFor="empleado-correo">
                    <span>Correo electrónico</span>
                    <input id="empleado-correo" type="email" value={datos.correo}
                        onChange={event => actualizar('correo', event.target.value)} maxLength={254} />
                </label>
            </div>
            {error && <p role="alert" className="tk-employee-error">{error}</p>}
            <div className="tk-employee-form-actions">
                <button type="button" className="tk-employee-secondary" onClick={onCancelar} disabled={guardando}>Cancelar</button>
                <button type="submit" className="tk-employee-primary" disabled={guardando}>
                    {guardando ? 'Guardando…' : empleado ? 'Guardar cambios' : 'Registrar empleado'}
                </button>
            </div>
        </form>
    </section>;
}
