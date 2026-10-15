import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cambiarEstadoEmpleado, cambiarHabilitacionTecnica, crearEmpleado, editarEmpleado, listarEmpleados, obtenerEmpleado } from '../src/features/empleados/empleados.api';
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => mocks);

beforeEach(() => { vi.resetAllMocks(); mocks.api.mockResolvedValue({}); });

describe('API Empleados', () => {
    it('lista personal', async () => {
        await listarEmpleados();
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados');
    });
    it('consulta detalle por ID', async () => {
        await obtenerEmpleado(17);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/17');
    });
    it('registra personal sin crear usuario', async () => {
        const datos = { codEmpleado: 'TEC-002', persona: { firstName: 'Ana', firstLastName: 'López' } };
        await crearEmpleado(datos);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados', { method: 'POST', body: JSON.stringify(datos) });
    });
    it('edita solamente los datos proporcionados', async () => {
        const datos = { codEmpleado: 'TEC-003' };
        await editarEmpleado(2, datos);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/2', { method: 'PATCH', body: JSON.stringify(datos) });
    });
    it('desactiva empleado con propiedad active', async () => {
        await cambiarEstadoEmpleado(3, false);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/3/estado', { method: 'PATCH', body: JSON.stringify({ active: false }) });
    });
    it('reactiva empleado', async () => {
        await cambiarEstadoEmpleado(3, true);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/3/estado', { method: 'PATCH', body: JSON.stringify({ active: true }) });
    });
    it('habilita y deshabilita técnico usando el nombre real del campo', async () => {
        await cambiarHabilitacionTecnica(7, true);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/7/habilitacion-tecnica', { method: 'PATCH', body: JSON.stringify({ habilitadoComoTecnico: true }) });
        await cambiarHabilitacionTecnica(7, false);
        expect(mocks.api).toHaveBeenCalledWith('/api/empleados/7/habilitacion-tecnica', { method: 'PATCH', body: JSON.stringify({ habilitadoComoTecnico: false }) });
    });
});
