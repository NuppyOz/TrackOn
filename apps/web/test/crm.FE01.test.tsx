import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrmPage } from '../src/features/comercial/crm/CrmPage';

const mocks = vi.hoisted(() => ({ listarClientes: vi.fn(), cambiarEstadoCliente: vi.fn(), obtenerPerfil: vi.fn(), actualizarPerfil: vi.fn(), listarContactos: vi.fn(), crearContacto: vi.fn(), actualizarContacto: vi.fn(), listarNotas: vi.fn(), crearNota: vi.fn(), listarDocumentos: vi.fn(), crearDocumento: vi.fn() }));
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientesPagina: mocks.listarClientes, cambiarEstadoCliente: mocks.cambiarEstadoCliente }));
vi.mock('../src/features/comercial/crm/crm.api', () => ({ obtenerPerfil: mocks.obtenerPerfil, actualizarPerfil: mocks.actualizarPerfil, listarContactos: mocks.listarContactos, crearContacto: mocks.crearContacto, actualizarContacto: mocks.actualizarContacto, listarNotas: mocks.listarNotas, crearNota: mocks.crearNota, listarDocumentos: mocks.listarDocumentos, crearDocumento: mocks.crearDocumento }));

const cliente = { id: 7, codigo: 'CLI-007', activo: true, telefonoComercial: null, correoComercial: null, persona: null, organizacion: { razonSocial: 'Acme S.A.', nombreComercial: 'Acme', identificacionTributaria: 'J031000001' } };
const perfil = { clienteId: 7, clasificacion: null, instruccionesFacturacion: null, version: 0 };

describe('CRM FE01', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() });
  it('presenta el directorio como vista principal con búsqueda y datos fiscales', async () => {
    mocks.listarClientes.mockResolvedValue({ items: [cliente], pagina: 1, limite: 10, hayMas: false, total: 1 }); render(<CrmPage />);
    expect(await screen.findByRole('cell', { name: 'Acme' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'J031000001' })).toBeTruthy();
    expect(screen.queryByLabelText('Cliente')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar clientes' }), { target: { value: 'CLI-007' } });
    expect(await screen.findByRole('cell', { name: 'Acme' })).toBeTruthy();
    await waitFor(() => expect(mocks.listarClientes).toHaveBeenLastCalledWith(expect.objectContaining({ buscar: 'CLI-007', pagina: 1 })));
  });
  it('abre una ficha de solo lectura y conserva las pestañas funcionales', async () => {
    mocks.listarClientes.mockResolvedValue({ items: [cliente], pagina: 1, limite: 10, hayMas: false, total: 1 }); mocks.obtenerPerfil.mockResolvedValue(perfil); mocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 10, hayMas: false });
    render(<CrmPage />); fireEvent.click(await screen.findByRole('button', { name: 'Acme' }));
    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeTruthy();
    expect(await screen.findByText('Sin clasificar')).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'Ficha del cliente' })).toBeTruthy();
    expect(mocks.listarClientes).toHaveBeenCalledTimes(1);
  });
  it('confirma la desactivación y actualiza el estado desde el backend', async () => {
    mocks.listarClientes.mockResolvedValue({ items: [cliente], pagina: 1, limite: 10, hayMas: false, total: 1 }); mocks.cambiarEstadoCliente.mockResolvedValue({ ...cliente, activo: false });
    render(<CrmPage />); await screen.findAllByText('Acme'); fireEvent.click(screen.getByRole('button', { name: 'Desactivar' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(mocks.cambiarEstadoCliente).toHaveBeenCalledWith(7, false));
  });
});
