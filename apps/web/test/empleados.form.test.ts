import { describe, expect, it } from 'vitest';
import { construirActualizacion, construirEmpleado, datosDesdeEmpleado, formularioVacio, validarFormularioEmpleado } from '../src/features/empleados/empleados.form';
const validos = { ...formularioVacio, codEmpleado: 'tec-001', firstName: 'María', firstLastName: 'López' };

describe('Formulario empleado', () => {
    it('inicia vacío', () => { expect(datosDesdeEmpleado(null)).toEqual(formularioVacio); });
    it('exige código', () => { expect(validarFormularioEmpleado({ ...validos, codEmpleado: '' })).toMatch(/código/); });
    it('limita el código a 30 caracteres', () => { expect(validarFormularioEmpleado({ ...validos, codEmpleado: 'X'.repeat(31) })).toMatch(/30/); });
    it('exige nombre y apellido', () => { expect(validarFormularioEmpleado({ ...validos, firstLastName: '' })).toMatch(/apellido/); });
    it('rechaza tipo de documento sin número', () => { expect(validarFormularioEmpleado({ ...validos, typeDocument: 'CEDULA_NIC' })).toMatch(/conjuntamente/); });
    it('rechaza documento sin tipo', () => { expect(validarFormularioEmpleado({ ...validos, numberDocument: '123' })).toMatch(/conjuntamente/); });
    it('rechaza cédula inválida', () => { expect(validarFormularioEmpleado({ ...validos, typeDocument: 'CEDULA_NIC', numberDocument: 'ABC' })).toMatch(/13 cifras/); });
    it('acepta cédula nicaragüense con guiones', () => { expect(validarFormularioEmpleado({ ...validos, typeDocument: 'CEDULA_NIC', numberDocument: '001-010190-0001A' })).toBe(null); });
    it('valida correo incorrecto', () => { expect(validarFormularioEmpleado({ ...validos, correo: 'sin-arroba' })).toMatch(/correo/); });
    it('acepta datos válidos sin documento', () => { expect(validarFormularioEmpleado(validos)).toBe(null); });
    it('normaliza código y elimina cadenas opcionales vacías', () => {
        expect(construirEmpleado({ ...validos, secondName: ' ', correo: '  ', telephone: ' ' })).toEqual({
            codEmpleado: 'TEC-001', persona: { firstName: 'María', secondName: null, firstLastName: 'López', secondLastName: null,
                typeDocument: null, numberDocument: null, telephone: null, correo: null },
        });
    });
    it('forma el PATCH para edición', () => {
        expect(construirActualizacion(validos)).toMatchObject({ codEmpleado: 'TEC-001', persona: { firstName: 'María' } });
    });
    it('carga correctamente los datos existentes con valores nulos', () => {
        const datos = datosDesdeEmpleado({ id: 9, codEmpleado: 'G-9', active: true, habilitadoComoTecnico: false, personaId: 3,
            persona: { id: 3, firstName: 'Juan', secondName: null, firstLastName: 'Pérez', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null } });
        expect(datos).toMatchObject({ codEmpleado: 'G-9', firstName: 'Juan', secondName: '', typeDocument: '' });
    });
});
