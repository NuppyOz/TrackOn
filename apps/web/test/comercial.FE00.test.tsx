import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComercialModule } from '../src/features/comercial/ComercialModule';

describe('ComercialModule FE00', () => {
  afterEach(cleanup);
  it('no duplica la navegación que ya ofrece el sidebar', () => {
    render(<ComercialModule section="crm" />);
    expect(screen.queryByLabelText('Área comercial')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gestión de clientes (CRM)' })).toBeTruthy();
  });
  it('usa un estado informativo cuando la pantalla aún no está integrada', () => {
    render(<ComercialModule section="crm" />);
    expect(screen.getByText(/se está implementando/i)).toBeTruthy();
  });
});
