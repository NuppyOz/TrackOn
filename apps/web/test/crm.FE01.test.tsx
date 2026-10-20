import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CrmPage } from '../src/features/comercial/crm/CrmPage';
import { ApiError } from '../src/shared/api';

const apiMocks = vi.hoisted(() => ({
  listarClientes: vi.fn(), obtenerPerfil: vi.fn(), actualizarPerfil: vi.fn(), listarContactos: vi.fn(),
  crearContacto: vi.fn(), actualizarContacto: vi.fn(), listarNotas: vi.fn(), crearNota: vi.fn(), listarDocumentos: vi.fn(), crearDocumento: vi.fn(),
}));
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: apiMocks.listarClientes }));
vi.mock('../src/features/comercial/crm/crm.api', () => ({
  obtenerPerfil: apiMocks.obtenerPerfil, actualizarPerfil: apiMocks.actualizarPerfil, listarContactos: apiMocks.listarContactos,
  crearContacto: apiMocks.crearContacto, actualizarContacto: apiMocks.actualizarContacto, listarNotas: apiMocks.listarNotas,
  crearNota: apiMocks.crearNota, listarDocumentos: apiMocks.listarDocumentos, crearDocumento: apiMocks.crearDocumento,
}));

const cliente = { id: 7, codigo: 'CLI-007', activo: true, telefonoComercial: null, correoComercial: null, persona: null, organizacion: { razonSocial: 'Acme S.A.', nombreComercial: 'Acme', identificacionTributaria: null } };
const perfil = { clienteId: 7, clasificacion: null, instruccionesFacturacion: null, version: 0 };
const contacto = { id: 2, clienteId: 7, nombre: 'Ana Ruiz', email: 'ana@example.com', telefono: null, cargo: 'Compras', activo: true, version: 1 };

describe('CRM FE01', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it('selecciona un cliente existente y abre su perfil complementario', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]); apiMocks.obtenerPerfil.mockResolvedValue(perfil); apiMocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 100, hayMas: false });
    render(<CrmPage />);
    fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    expect(await screen.findByRole('heading', { name: 'Acme' })).toBeTruthy();
    expect(await screen.findByText('Sin clasificar')).toBeTruthy();
    expect(apiMocks.listarClientes).toHaveBeenCalledTimes(1);
  });
  it('guarda cambios de perfil con versión y conserva vacíos como null', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]); apiMocks.obtenerPerfil.mockResolvedValue(perfil); apiMocks.actualizarPerfil.mockResolvedValue({ ...perfil, clasificacion: 'Preferente', version: 1 }); apiMocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 100, hayMas: false });
    render(<CrmPage />); fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    fireEvent.change(screen.getByLabelText('Clasificación'), { target: { value: 'Preferente' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    await waitFor(() => expect(apiMocks.actualizarPerfil).toHaveBeenCalledWith(7, { version: 0, clasificacion: 'Preferente', instruccionesFacturacion: null }));
    expect((await screen.findByRole('status')).textContent).toContain('Perfil guardado.');
  });
  it('crea contactos y actualiza la lista del servidor', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]); apiMocks.obtenerPerfil.mockResolvedValue(perfil); apiMocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 100, hayMas: false }); apiMocks.crearContacto.mockResolvedValue(contacto);
    render(<CrmPage />); fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contactos' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Agregar contacto' }));
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Ana Ruiz' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contacto' }));
    await waitFor(() => expect(apiMocks.crearContacto).toHaveBeenCalledWith(7, { nombre: 'Ana Ruiz', email: 'ana@example.com', telefono: null, cargo: null }));
    expect(apiMocks.listarContactos.mock.calls.length).toBeGreaterThan(1);
  });
  it('muestra acciones del contacto en menú y permite desactivarlo', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]); apiMocks.obtenerPerfil.mockResolvedValue(perfil); apiMocks.listarContactos.mockResolvedValue({ items: [contacto], pagina: 1, limite: 100, hayMas: false }); apiMocks.actualizarContacto.mockResolvedValue({ ...contacto, activo: false, version: 2 });
    render(<CrmPage />); fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contactos' }));
    fireEvent.click(await screen.findByLabelText('Acciones para Ana Ruiz'));
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(apiMocks.actualizarContacto).toHaveBeenCalledWith(7, 2, { version: 1, activo: false }));
  });
  it('mantiene visible el error de perfil cuando la carga de contactos termina bien', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]); apiMocks.obtenerPerfil.mockRejectedValue(new Error('perfil fuera de servicio')); apiMocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 10, hayMas: false });
    render(<CrmPage />); fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    expect(await screen.findByText('No se pudo cargar el perfil comercial.')).toBeTruthy();
    expect(screen.queryByText('Sin clasificar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).toBeNull();
  });
  it('conserva el borrador ante conflicto 409 y permite recargar explícitamente', async () => {
    apiMocks.listarClientes.mockResolvedValue([cliente]);
    apiMocks.obtenerPerfil.mockResolvedValueOnce(perfil).mockResolvedValueOnce({ ...perfil, clasificacion: 'Actualizada', version: 2 });
    apiMocks.actualizarPerfil.mockRejectedValue(new ApiError('Versión desactualizada', 409));
    apiMocks.listarContactos.mockResolvedValue({ items: [], pagina: 1, limite: 10, hayMas: false });
    render(<CrmPage />); fireEvent.change(await screen.findByLabelText('Cliente'), { target: { value: '7' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    const campo = await screen.findByLabelText('Clasificación');
    fireEvent.change(campo, { target: { value: 'Borrador propio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Tus cambios siguen aquí');
    expect((screen.getByLabelText('Clasificación') as HTMLInputElement).value).toBe('Borrador propio');
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios y recargar' }));
    await waitFor(() => expect(screen.getByText('Actualizada')).toBeTruthy());
    expect(apiMocks.obtenerPerfil).toHaveBeenCalledTimes(2);
  });
});
