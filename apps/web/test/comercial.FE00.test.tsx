import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComercialModule } from '../src/features/comercial/ComercialModule';

describe('ComercialModule FE00', () => {
  afterEach(cleanup);
  it('muestra secciones disponibles y navega por callback', () => {
    const onNavigate = vi.fn();
    render(<ComercialModule section="crm" availableSections={['crm', 'cotizaciones-ventas']} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cotizaciones y ventas' }));
    expect(onNavigate).toHaveBeenCalledWith('cotizaciones-ventas');
    expect(screen.queryByRole('button', { name: 'Catálogo y tarifas' })).toBeNull();
  });
  it('usa un estado informativo cuando la pantalla aún no está integrada', () => {
    render(<ComercialModule section="crm" />);
    expect(screen.getByText(/se está implementando/i)).toBeTruthy();
  });
});
