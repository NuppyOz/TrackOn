import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InsightsPage from '../src/features/insights/InsightsPage';

const mocks = vi.hoisted(() => ({ generarReporte: vi.fn(), listarReportes: vi.fn(), descargarReporte: vi.fn() }));
vi.mock('../src/features/insights/insights.api', () => mocks);
beforeEach(() => { vi.resetAllMocks(); mocks.generarReporte.mockResolvedValue({ id: 1 }); mocks.listarReportes.mockResolvedValue({ items: [], total: 0, pagina: 1, limite: 10 }); });
afterEach(cleanup);

describe('Insights', () => {
  it('muestra el catálogo de dashboards con búsqueda y acceso', () => {
    render(<InsightsPage ruta="/dashboard" />);
    expect(screen.getByRole('heading', { name: 'Tableros' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Historial' })).toBeNull();
    expect(screen.getByText('Indicadores financieros')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver Indicadores financieros' }).querySelector('svg')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'comerciales' } });
    expect(screen.getByText('Indicadores comerciales')).toBeTruthy();
    expect(screen.queryByText('Indicadores financieros')).toBeNull();
  });

  it('genera un reporte real con el tipo elegido', async () => {
    window.history.pushState(null, '', '/insights/reportes');
    render(<InsightsPage ruta="/insights/reportes" />);
    fireEvent.change(screen.getByLabelText('Contenido del reporte'), { target: { value: 'CLIENTES' } });
    fireEvent.click(screen.getByRole('button', { name: 'Exportar reporte (.csv)' }));
    expect(screen.getByText(/¿Generar el reporte de Clientes/)).toBeTruthy();
    expect(mocks.generarReporte).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    await waitFor(() => expect(mocks.generarReporte).toHaveBeenCalledWith({ tipo: 'CLIENTES' }));
  });

  it('presenta historial vacío con paginación de diez registros', async () => {
    render(<InsightsPage ruta="/insights/historial" />);
    expect(await screen.findByText('Aún no hay reportes')).toBeTruthy();
    expect(mocks.listarReportes).toHaveBeenCalledWith(1);
  });
});
