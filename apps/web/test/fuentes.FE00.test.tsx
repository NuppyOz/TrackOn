import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FuentesGerencialesModule } from '../src/features/fuentes-gerenciales/FuentesGerencialesModule';

describe('FuentesGerencialesModule FE00', () => {
  afterEach(cleanup);
  it('expone navegación disponible y fallback informativo', () => {
    const onNavigate = vi.fn();
    render(<FuentesGerencialesModule section="contratos" availableSections={['contratos', 'calidad']} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registros de calidad' }));
    expect(onNavigate).toHaveBeenCalledWith('calidad');
    expect(screen.getByText(/se están implementando/i)).toBeTruthy();
  });
});
