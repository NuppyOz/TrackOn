import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import OrdenesManager from '../src/features/ordenes/OrdenesManager';
import type { OrdenDetalle, OrdenResumen } from '../src/features/ordenes/ordenes.types';

const mocks = vi.hoisted(() => ({
    listarUbicaciones: vi.fn(),
    listarOrdenes: vi.fn(),
    crearOrden: vi.fn(),
    obtenerOrden: vi.fn(),
    cambiarEstadoOrden: vi.fn(),
    editarOrden: vi.fn(),
}));

vi.mock('../src/features/equipos/equipos.api', () => ({ listarUbicaciones: mocks.listarUbicaciones }));
// El panel de equipos tiene pruebas independientes.
// Se simula aquí para aislar las pruebas de gestión de órdenes.
vi.mock('../src/features/ordenes/EquiposOrdenPanel', () => ({
    default: () => null,
}));

vi.mock('../src/features/ordenes/ordenes.api', () => ({
    listarOrdenes: mocks.listarOrdenes,
    crearOrden: mocks.crearOrden,
    obtenerOrden: mocks.obtenerOrden,
    cambiarEstadoOrden: mocks.cambiarEstadoOrden,
    editarOrden: mocks.editarOrden,
}));

const orden: OrdenResumen = {
    id: 14, numero: '140', ubicacionId: 3, estadoCodigo: 'PENDIENTE',
    solicitud: 'Mantenimiento del aire acondicionado', prioridad: 'ALTA',
    fechaProgramada: null, creadaEn: '2026-10-09T20:00:00Z',
    actualizadaEn: '2026-10-09T20:00:00Z', cerradaEn: null, version: 1,
    clienteNombreRegistrado: 'Cliente de prueba', ubicacionNombreRegistrado: 'Casa principal',
    direccionRegistrada: 'Managua',
};
const detalle: OrdenDetalle = {
    ...orden, clienteIdentificacionRegistrada: null,
    creadaPor: { id: 9, identificador: 'administrador.trackon' },
    historial: [{ id: 1, estadoAnterior: null, estadoNuevo: 'PENDIENTE',
        motivo: 'Registro inicial de la orden.', fecha: '2026-10-09T20:00:00Z' }],
};

function pagina(items: OrdenResumen[] = [orden], hayMas = false) {
    return { items, hayMas, pagina: 1, limite: 25 };
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.listarOrdenes.mockResolvedValue(pagina());
    mocks.listarUbicaciones.mockResolvedValue([{
        id: 3, nombre: 'Casa principal', direccion: 'Managua', activa: true,
        cliente: { id: 2, codigo: 'CLI-002', persona: { firstName: 'Ana', firstLastName: 'López' }, organizacion: null },
    }]);
    mocks.crearOrden.mockResolvedValue(detalle);
    mocks.obtenerOrden.mockResolvedValue(detalle);
    mocks.cambiarEstadoOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'CANCELADA' });
    mocks.editarOrden.mockResolvedValue({ ...detalle, version: 2 });
});

afterEach(cleanup);

async function esperarListado() {
    await screen.findByText('OT-140');
}

function abrirAlta() {
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva orden' }));
}

describe('Gestión web de órdenes de trabajo', () => {
    it('muestra cuatro acciones con icono y nombre visibles sin un menú desplegable', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        const acciones = within(screen.getByRole('group', { name: 'Acciones de OT-140' }));
        for (const nombre of ['Ver', 'Editar', 'Asignar', 'Desactivar']) {
            const boton = acciones.getByRole('button', { name: `${nombre} OT-140` });
            expect(boton.textContent).toBe(nombre);
            expect(boton.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
            expect(boton.getAttribute('title')).toBeTruthy();
        }
        expect(acciones.queryByRole('combobox')).toBeNull();
    });
    it('edita desde el listado, envía solo los campos cambiados y conserva los filtros', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.change(screen.getByLabelText('Buscar órdenes'), { target: { value: 'motor' } });
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ buscar: 'motor' })));
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Editar OT-140' }));
        expect(screen.getByRole('dialog', { name: 'Editar OT-140' })).toBeTruthy();
        expect(mocks.obtenerOrden).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('Solicitud'), { target: { value: 'Mantenimiento actualizado del motor' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
        await waitFor(() => expect(mocks.editarOrden).toHaveBeenCalledWith(14, { version: 1, solicitud: 'Mantenimiento actualizado del motor' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect((screen.getByLabelText('Buscar órdenes') as HTMLInputElement).value).toBe('motor');
        expect(window.location.pathname).not.toMatch(/\/ordenes\/14$/);
    });
    it('conserva la edición fallida y bloquea doble envío y cierre durante el guardado', async () => {
        let rechazar!: (error: Error) => void;
        mocks.editarOrden.mockReturnValue(new Promise((_, reject) => { rechazar = reject; }));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Editar OT-140' }));
        fireEvent.change(screen.getByLabelText('Solicitud'), { target: { value: 'Solicitud a conservar' } });
        const form = screen.getByLabelText('Solicitud').closest('form')!;
        fireEvent.submit(form); fireEvent.submit(form);
        expect(mocks.editarOrden).toHaveBeenCalledTimes(1);
        expect((screen.getByRole('button', { name: 'Cerrar ventana' }) as HTMLButtonElement).disabled).toBe(true);
        await act(async () => { rechazar(new Error('La orden cambió durante la operación')); });
        expect(screen.getByRole('alert').textContent).toContain('La orden cambió');
        expect((screen.getByLabelText('Solicitud') as HTMLTextAreaElement).value).toBe('Solicitud a conservar');
    });
    it('desactiva desde Acciones únicamente después de indicar un motivo', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar OT-140' }));
        expect((screen.getByRole('button', { name: 'Desactivar orden' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(screen.getByLabelText('Motivo de desactivación'), { target: { value: 'Cancelación solicitada' } });
        fireEvent.click(screen.getByRole('button', { name: 'Desactivar orden' }));
        await waitFor(() => expect(mocks.cambiarEstadoOrden).toHaveBeenCalledWith(14, 'CANCELADA', 'Cancelación solicitada'));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(screen.getByRole('alert').textContent).toContain('Orden desactivada');
    });
    it('habilita solo Ver en órdenes cerradas y protege las mutaciones', async () => {
        mocks.listarOrdenes.mockResolvedValue(pagina([{ ...orden, estadoCodigo: 'CERRADA' }]));
        render(<OrdenesManager />);
        await esperarListado();
        for (const nombre of ['Editar', 'Asignar', 'Desactivar']) expect(screen.getByRole('button', { name: `${nombre} OT-140` })).toHaveProperty('disabled', true);
        fireEvent.click(screen.getByRole('button', { name: 'Editar OT-140' }));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(mocks.editarOrden).not.toHaveBeenCalled();
    });
    it('aplica prioridad, cliente y fechas automáticamente y permite restablecerlos', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.change(screen.getByLabelText('Filtrar prioridad'), { target: { value: 'URGENTE' } });
        fireEvent.change(screen.getByLabelText('Filtrar cliente'), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText('Programada desde'), { target: { value: '2026-10-01' } });
        fireEvent.change(screen.getByLabelText('Programada hasta'), { target: { value: '2026-10-31' } });
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ prioridad: 'URGENTE', clienteId: '2', desde: '2026-10-01', hasta: '2026-10-31', pagina: 1 })));
        fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenLastCalledWith({ estado: '', buscar: '', pagina: 1, limite: 25 }));
        expect((screen.getByLabelText('Programada desde') as HTMLInputElement).value).toBe('');
    });
    it('ignora respuestas anteriores al último filtro de órdenes', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        let resolver!: (valor: ReturnType<typeof pagina>) => void;
        mocks.listarOrdenes.mockReturnValueOnce(new Promise(resolve => { resolver = resolve; })).mockResolvedValueOnce(pagina([]));
        fireEvent.click(screen.getByRole('button', { name: 'Asignadas' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cerradas' }));
        await screen.findByText('No hay órdenes para estos filtros.');
        await act(async () => { resolver(pagina()); });
        expect(screen.queryByText('OT-140')).toBeNull();
        expect(screen.getByRole('button', { name: 'Cerradas' }).getAttribute('aria-pressed')).toBe('true');
    });
    it('lista órdenes al iniciar', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        expect(screen.getByText('Cliente de prueba')).toBeTruthy();
        expect(screen.getByText('ALTA')).toBeTruthy();
    });

    it('muestra un estado vacío', async () => {
        mocks.listarOrdenes.mockResolvedValue(pagina([]));
        render(<OrdenesManager />);
        expect(await screen.findByText('No hay órdenes para estos filtros.')).toBeTruthy();
    });

    it('informa errores de carga inicial', async () => {
        mocks.listarOrdenes.mockRejectedValue(new Error('Servidor fuera de servicio'));
        render(<OrdenesManager />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Servidor fuera de servicio');
    });

    it('filtra por cliente o solicitud y estado', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.change(screen.getByRole('textbox', { name: 'Buscar órdenes' }), { target: { value: 'motor' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar estado de orden' }), { target: { value: 'PENDIENTE' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith({
            estado: 'PENDIENTE', buscar: 'motor', pagina: 1, limite: 25,
        }));
    });

    it('permite abrir y cancelar el alta', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        expect(screen.getByText('Nueva orden de trabajo')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.getByText('OT-140')).toBeTruthy();
    });

    it('crea una orden desde el formulario', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '2' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Solicitud' }), { target: { value: 'Revisar el compresor' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Prioridad' }), { target: { value: 'URGENTE' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));
        await waitFor(() => expect(mocks.crearOrden).toHaveBeenCalledWith({
            ubicacionId: 3, solicitud: 'Revisar el compresor', prioridad: 'URGENTE', fechaProgramada: null,
        }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Orden OT-140 creada.');
    });

    it('muestra errores de creación y conserva el formulario', async () => {
        mocks.crearOrden.mockRejectedValue(new Error('Ubicación inactiva'));
        render(<OrdenesManager />);
        await esperarListado();
        abrirAlta();
        fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: '2' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Ubicación' }), { target: { value: '3' } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Solicitud' }), { target: { value: 'Revisar el compresor' } });
        fireEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));
        const ventana = within(screen.getByRole('dialog', { name: 'Nueva orden de trabajo' }));
        expect(await ventana.findByRole('alert')).toHaveProperty('textContent', 'Ubicación inactiva');
        expect(ventana.getByRole('textbox', { name: 'Solicitud' })).toHaveProperty('value', 'Revisar el compresor');
    });

    it('abre detalle con historial de movimientos', async () => {
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        expect(await screen.findByText('Historial de estados')).toBeTruthy();
        expect(screen.getByText(/Registro inicial de la orden/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
        expect(screen.queryByText('Historial de estados')).toBeNull();
    });

    it('informa errores al consultar detalle', async () => {
        mocks.obtenerOrden.mockRejectedValue(new Error('No existe'));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No existe');
    });

    it('cambia el estado de una orden cuando está permitido', async () => {
        mocks.obtenerOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'ASIGNADA' });
        mocks.cambiarEstadoOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'EN_EJECUCION' });
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        await screen.findByText('Historial de estados');
        expect(screen.queryByRole('combobox', { name: 'Nuevo estado' })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo del cambio' }), { target: { value: 'Comienzo del trabajo' } });
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar trabajo' }));
        await waitFor(() => expect(mocks.cambiarEstadoOrden).toHaveBeenCalledWith(14, 'EN_EJECUCION', 'Comienzo del trabajo'));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Estado actualizado correctamente.');
    });

    it('muestra errores de cambio de estado', async () => {
        mocks.obtenerOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'ASIGNADA' });
        mocks.cambiarEstadoOrden.mockRejectedValue(new Error('Cambio no permitido'));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        await screen.findByText('Historial de estados');
        expect(screen.queryByRole('combobox', { name: 'Nuevo estado' })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'Motivo del cambio' }), { target: { value: 'Comienzo del trabajo' } });
        fireEvent.click(screen.getByRole('button', { name: 'Iniciar trabajo' }));
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Cambio no permitido');
    });

    it('respeta permisos de solo consulta para técnicos', async () => {
        render(<OrdenesManager puedeGestionar={false} />);
        await esperarListado();
        expect(screen.queryByRole('button', { name: '+ Nueva orden' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        await screen.findByText('Historial de estados');
        expect(screen.queryByRole('button', { name: 'Iniciar trabajo' })).toBeNull();
    });

    it.each([
        ['Devolver a ejecución', 'EN_EJECUCION'],
        ['Cerrar orden', 'CERRADA'],
    ] as const)('permite %s desde revisión con una acción explícita y un motivo', async (accion, estado) => {
        mocks.obtenerOrden.mockResolvedValue({ ...detalle, estadoCodigo: 'EN_REVISION' });
        mocks.cambiarEstadoOrden.mockResolvedValue({ ...detalle, estadoCodigo: estado });
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Ver OT-140' }));
        await screen.findByRole('button', { name: accion });
        fireEvent.change(screen.getByLabelText('Motivo del cambio'), { target: { value: 'Revisión realizada por gerencia' } });
        fireEvent.click(screen.getByRole('button', { name: accion }));
        await waitFor(() => expect(mocks.cambiarEstadoOrden).toHaveBeenCalledWith(14, estado, 'Revisión realizada por gerencia'));
    });

    it('permite avanzar y retroceder páginas', async () => {
        mocks.listarOrdenes.mockResolvedValue(pagina([orden], true));
        render(<OrdenesManager />);
        await esperarListado();
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })));
        fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
        await waitFor(() => expect(mocks.listarOrdenes).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1 })));
    });
});
