import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import EvidenciasPanel from '../src/features/ordenes/EvidenciasPanel';
import type { EvidenciaOrden } from '../src/features/ordenes/ordenes.evidencias.api';

const mocks = vi.hoisted(() => ({
    listarEvidencias: vi.fn(), prepararEvidencia: vi.fn(), cargarEvidencia: vi.fn(),
    descargarEvidencia: vi.fn(), revisarEvidencia: vi.fn(), createObjectURL: vi.fn(), revokeObjectURL: vi.fn(),
}));
vi.mock('../src/features/ordenes/ordenes.evidencias.api', () => ({
    listarEvidencias: mocks.listarEvidencias, prepararEvidencia: mocks.prepararEvidencia,
    cargarEvidencia: mocks.cargarEvidencia, descargarEvidencia: mocks.descargarEvidencia, revisarEvidencia: mocks.revisarEvidencia,
}));

const evidencia: EvidenciaOrden = { id: 1, nombreOriginal: 'equipo.pdf', tipoArchivo: 'application/pdf', tamanoBytes: 2048,
    hashArchivo: 'abc', estadoCarga: 'DISPONIBLE', cargadaPorId: 1, revisiones: [{ decision: 'ACEPTADA', observacion: 'Legible' }] };

beforeEach(() => {
    vi.resetAllMocks(); mocks.listarEvidencias.mockResolvedValue([evidencia]);
    mocks.prepararEvidencia.mockResolvedValue({ evidencia: { ...evidencia, id: 2, nombreOriginal: 'nueva.pdf', estadoCarga: 'PENDIENTE' }, contenido: new ArrayBuffer(2) });
    mocks.cargarEvidencia.mockResolvedValue({}); mocks.descargarEvidencia.mockResolvedValue(new Blob(['pdf'])); mocks.revisarEvidencia.mockResolvedValue({});
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: mocks.createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: mocks.revokeObjectURL });
    mocks.createObjectURL.mockReturnValue('blob:archivo');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Evidencias de una orden', () => {
    it('lista y descarga una evidencia disponible', async () => {
        render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar puedeRevisar />);
        await screen.findByText('equipo.pdf'); expect(screen.getByText(/2 KB ACEPTADA/)).toBeTruthy(); expect(screen.getByText('Legible')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Descargar archivo' }));
        await waitFor(() => expect(mocks.descargarEvidencia).toHaveBeenCalledWith(10, 20, 1));
        expect(mocks.createObjectURL).toHaveBeenCalled();
    });

    it('aprueba y rechaza una evidencia con observaciones', async () => {
        render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar={false} puedeRevisar />); await screen.findByText('equipo.pdf');
        fireEvent.click(screen.getByRole('button', { name: 'Revisar evidencia' }));
        fireEvent.change(screen.getByLabelText('Observaciones de revisión'), { target: { value: 'Todo correcto' } });
        fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
        await waitFor(() => expect(mocks.revisarEvidencia).toHaveBeenCalledWith(10, 20, 1, 'ACEPTADA', 'Todo correcto'));
        expect(await screen.findByText('Revisión de evidencia registrada.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Revisar evidencia' }));
        fireEvent.change(screen.getByLabelText('Observaciones de revisión'), { target: { value: 'Archivo ilegible' } });
        fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
        await waitFor(() => expect(mocks.revisarEvidencia).toHaveBeenLastCalledWith(10, 20, 1, 'RECHAZADA', 'Archivo ilegible'));
    });

    it('carga un archivo nuevo y reemplaza uno existente', async () => {
        render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar puedeRevisar={false} />); await screen.findByText('equipo.pdf');
        const archivo = new File(['contenido'], 'nueva.pdf', { type: 'application/pdf' });
        fireEvent.change(screen.getByLabelText(/Agregar evidencia/), { target: { files: [archivo] } });
        fireEvent.click(screen.getByRole('button', { name: 'Subir evidencia' }));
        await waitFor(() => expect(mocks.prepararEvidencia).toHaveBeenCalledWith(10, 20, archivo, undefined));
        await waitFor(() => expect(mocks.cargarEvidencia).toHaveBeenCalledWith(10, 20, 2, expect.any(ArrayBuffer)));
        expect(await screen.findByText('Evidencia disponible para revisión.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Reemplazar archivo' }));
        expect(screen.getByText(/Reemplazar equipo.pdf/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar reemplazo' }));
        expect(screen.getByText(/Agregar evidencia/)).toBeTruthy();
    });

    it('muestra evidencias históricas, lista vacía y errores', async () => {
        mocks.listarEvidencias.mockResolvedValueOnce([{ ...evidencia, reemplazos: [{ id: 2 }] }]);
        const { unmount } = render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar puedeRevisar />);
        expect(await screen.findByText('Conservada como histórico; tiene una evidencia de reemplazo.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Descargar archivo' })).toBeNull(); unmount();
        mocks.listarEvidencias.mockResolvedValueOnce([]);
        const vista = render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar={false} puedeRevisar={false} />);
        expect(await screen.findByText('Sin evidencias registradas.')).toBeTruthy(); vista.unmount();
        mocks.listarEvidencias.mockRejectedValueOnce(new Error('No se pudo listar'));
        render(<EvidenciasPanel ordenId={10} registroId={20} puedeCargar={false} puedeRevisar={false} />);
        expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No se pudo listar');
    });
});
