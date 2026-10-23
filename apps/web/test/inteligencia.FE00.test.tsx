import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InteligenciaModule } from '../src/features/inteligencia/InteligenciaModule';

describe('InteligenciaModule FE00', () => {
  afterEach(cleanup);
  it('solo navega a tableros disponibles', () => {
    const onNavigate = vi.fn();
    render(<InteligenciaModule section="comercial" availableSections={['comercial', 'calidad']} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /calidad/i }));
    expect(onNavigate).toHaveBeenCalledWith('calidad');
    expect(screen.queryByRole('button', { name: /financiero/i })).toBeNull();
  });
  it('muestra fallback sin fabricar indicadores', () => {
    render(<InteligenciaModule section="financiero" />);
    expect(screen.getByText(/fuentes estén disponibles/i)).toBeTruthy();
  });
});
