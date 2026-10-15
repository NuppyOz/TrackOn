import type { CrearEmpleado, EditarEmpleado, EmpleadoDetalle, TipoDocumento } from './empleados.types';

export interface DatosFormularioEmpleado {
    codEmpleado: string;
    firstName: string;
    secondName: string;
    firstLastName: string;
    secondLastName: string;
    typeDocument: '' | TipoDocumento;
    numberDocument: string;
    telephone: string;
    correo: string;
}

export const formularioVacio: DatosFormularioEmpleado = {
    codEmpleado: '', firstName: '', secondName: '', firstLastName: '',
    secondLastName: '', typeDocument: '', numberDocument: '', telephone: '', correo: '',
};

export function datosDesdeEmpleado(empleado: EmpleadoDetalle | null): DatosFormularioEmpleado {
    if (!empleado) return { ...formularioVacio };
    return {
        codEmpleado: empleado.codEmpleado,
        firstName: empleado.persona.firstName,
        secondName: empleado.persona.secondName ?? '',
        firstLastName: empleado.persona.firstLastName,
        secondLastName: empleado.persona.secondLastName ?? '',
        typeDocument: empleado.persona.typeDocument ?? '',
        numberDocument: empleado.persona.numberDocument ?? '',
        telephone: empleado.persona.telephone ?? '',
        correo: empleado.persona.correo ?? '',
    };
}

export function validarFormularioEmpleado(datos: DatosFormularioEmpleado): string | null {
    if (!datos.codEmpleado.trim()) return 'El código del empleado es obligatorio.';
    if (datos.codEmpleado.trim().length > 30) return 'El código admite hasta 30 caracteres.';
    if (!datos.firstName.trim() || !datos.firstLastName.trim()) {
        return 'El primer nombre y el primer apellido son obligatorios.';
    }
    if (Boolean(datos.typeDocument) !== Boolean(datos.numberDocument.trim())) {
        return 'Indica conjuntamente el tipo y el número de documento.';
    }
    if (datos.typeDocument === 'CEDULA_NIC' &&
        !/^\d{13}[A-Z]$/.test(datos.numberDocument.replace(/[\s-]/g, '').toUpperCase())) {
        return 'La cédula nicaragüense debe contener 13 cifras y una letra final.';
    }
    if (datos.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
        return 'Introduce un correo electrónico válido.';
    }
    return null;
}

function nullable(valor: string) { return valor.trim() || null; }

export function construirEmpleado(datos: DatosFormularioEmpleado): CrearEmpleado {
    return {
        codEmpleado: datos.codEmpleado.trim().toUpperCase(),
        persona: {
            firstName: datos.firstName.trim(),
            secondName: nullable(datos.secondName),
            firstLastName: datos.firstLastName.trim(),
            secondLastName: nullable(datos.secondLastName),
            typeDocument: datos.typeDocument || null,
            numberDocument: datos.numberDocument.trim() || null,
            telephone: nullable(datos.telephone),
            correo: nullable(datos.correo),
        },
    };
}

export function construirActualizacion(datos: DatosFormularioEmpleado): EditarEmpleado {
    const empleado = construirEmpleado(datos);
    return { codEmpleado: empleado.codEmpleado, persona: empleado.persona };
}
