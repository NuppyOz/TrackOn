import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EquipoProvisionalForm from '../src/features/ordenes/EquipoProvisionalForm';

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../src/shared/api', () => ({ api: mocks.api }));

const registro = { id: 30, ordenId: 10, equipoId: null, descripcionProvisional: 'Unidad exterior sin placa' };

beforeEach(() => { vi.resetAllMocks(); mocks.api.mockResolvedValue(registro); });
afterEach(cleanup);

function completarBase() {
    fireEvent.change(screen.getByLabelText('Descripción e identificación del equipo *'), { target: { value: 'Unidad exterior ubicada en el techo' } });
    fireEvent.change(screen.getByLabelText('Tipo de equipo *'), { target: { value: 'Aire acondicionado' } });
}

describe('Identificación provisional del equipo', () => {
    it('guarda datos visibles y normaliza los motivos como nulos', async () => {
        const onSaved = vi.fn(); render(<EquipoProvisionalForm ordenId={10} onSaved={onSaved} onCancel={vi.fn()} />); completarBase();
        fireEvent.change(screen.getByLabelText('Marca'), { target: { value: ' Carrier ' } });
        fireEvent.change(screen.getByLabelText('Modelo'), { target: { value: ' X100 ' } });
        fireEvent.change(screen.getByLabelText('Número de serie'), { target: { value: ' SER-9 ' } });
        expect(screen.queryByLabelText(/Por qué no es visible/)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar identificación provisional' }));
        await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('/api/ordenes/10/equipos-provisionales', {
            method: 'POST', body: JSON.stringify({
                descripcionProvisional: 'Unidad exterior ubicada en el techo', tipoRegistrado: 'Aire acondicionado',
                marcaRegistrada: 'Carrier', modeloRegistrado: 'X100', serieRegistrada: 'SER-9',
                motivoMarcaNoVisible: null, motivoModeloNoVisible: null, motivoSerieNoVisible: null,
            }),
        }));
        expect(onSaved).toHaveBeenCalledWith(registro);
    });

    it('envía los motivos cuando los identificadores no son visibles', async () => {
        render(<EquipoProvisionalForm ordenId={11} onSaved={vi.fn()} onCancel={vi.fn()} />); completarBase();
        fireEvent.change(screen.getByLabelText('¿Por qué no es visible marca? *'), { target: { value: 'Etiqueta borrada' } });
        fireEvent.change(screen.getByLabelText('¿Por qué no es visible modelo? *'), { target: { value: 'Placa ausente' } });
        fireEvent.change(screen.getByLabelText('¿Por qué no es visible número de serie? *'), { target: { value: 'Cubierta dañada' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Guardar identificación provisional' }).closest('form')!);
        await waitFor(() => expect(mocks.api).toHaveBeenCalled());
        const cuerpo = JSON.parse(mocks.api.mock.calls[0][1].body);
        expect(cuerpo).toMatchObject({ marcaRegistrada: null, motivoMarcaNoVisible: 'Etiqueta borrada', modeloRegistrado: null,
            motivoModeloNoVisible: 'Placa ausente', serieRegistrada: null, motivoSerieNoVisible: 'Cubierta dañada' });
    });

    it('permite cancelar e informa errores sin cerrar el formulario', async () => {
        const onCancel = vi.fn(); mocks.api.mockRejectedValue(new Error('No se pudo registrar'));
        render(<EquipoProvisionalForm ordenId={10} onSaved={vi.fn()} onCancel={onCancel} />); completarBase();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(onCancel).toHaveBeenCalledOnce();
        fireEvent.submit(screen.getByRole('button', { name: 'Guardar identificación provisional' }).closest('form')!);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No se pudo registrar');
    });
});
