import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CotizacionesPage } from '../src/features/comercial/cotizaciones/CotizacionesPage'

const mocks = vi.hoisted(() => ({
  listarCotizaciones: vi.fn(), obtenerCotizacion: vi.fn(), crearCotizacion: vi.fn(), actualizarCotizacion: vi.fn(), enviarCotizacion: vi.fn(), decidirCotizacion: vi.fn(), agregarNotaCotizacion: vi.fn(),
  listarClientes: vi.fn(), listarContactos: vi.fn(), listarConceptos: vi.fn(),
}))
vi.mock('../src/features/comercial/cotizaciones/cotizaciones.api', () => mocks)
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: mocks.listarClientes }))
vi.mock('../src/features/comercial/crm/crm.api', () => ({ listarContactos: mocks.listarContactos }))
vi.mock('../src/features/comercial/tarifas/tarifas.api', () => ({ listarConceptos: mocks.listarConceptos }))

const page = <T,>(items: T[] = []) => ({ items, pagina: 1, limite: 25, hayMas: false })
const quote = {
  id: 41, clienteId: 5, clienteNombreRegistrado: 'Taller Central', clienteIdentificacionRegistrada: null, contactoId: null, estadoPersistido: 'BORRADOR', estadoEfectivo: 'BORRADOR',
  subtotal: '125.00', descuento: '0.00', total: '125.00', moneda: 'NIO', venceEn: '2026-11-01T12:00:00.000Z', version: 2, creadaEn: '2026-10-20T12:00:00Z', actualizadaEn: '2026-10-20T12:00:00Z', enviadaEn: null, decididaEn: null, ventaId: null,
  accionesPermitidas: { editar: true, enviar: true, decidir: false, convertirVenta: false }, nota: null, creadaPorId: 1, decisionOrigen: null, decisionComentario: null,
  lineas: [{ id: 1, posicion: 1, conceptoId: 10, descripcion: 'Mantenimiento', tipo: 'SERVICIO', unidad: 'servicio', cantidad: '1.000', precio: '125.00', descuento: '0.00', subtotal: '125.00', total: '125.00' }], notas: [],
}

describe('CotizacionesPage FE03', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal('confirm', vi.fn(() => true)); vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-intencion') })
    mocks.listarCotizaciones.mockResolvedValue(page([quote])); mocks.obtenerCotizacion.mockResolvedValue(quote); mocks.crearCotizacion.mockResolvedValue(quote)
    mocks.actualizarCotizacion.mockResolvedValue(quote); mocks.enviarCotizacion.mockResolvedValue(quote); mocks.decidirCotizacion.mockResolvedValue(quote); mocks.agregarNotaCotizacion.mockResolvedValue(quote)
    mocks.listarClientes.mockResolvedValue([{ id: 5, codigo: 'C-05', activo: true, telefonoComercial: null, correoComercial: null, persona: null, organizacion: { razonSocial: 'Taller Central', nombreComercial: null, identificacionTributaria: null } }])
    mocks.listarContactos.mockResolvedValue(page([])); mocks.listarConceptos.mockResolvedValue(page([{ id: 10, codigo: 'MANT-1', nombre: 'Mantenimiento', unidad: 'servicio', activo: true }]))
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('consulta tabla, búsqueda, estado y páginas contra la API', async () => {
    render(<CotizacionesPage />)
    expect(await screen.findByRole('cell', { name: 'Taller Central' })).toBeTruthy()
    expect(mocks.listarCotizaciones).toHaveBeenCalledWith({ pagina: 1, limite: 25, q: undefined, estado: undefined, clienteId: undefined, sortBy: 'id', sortDir: 'desc' })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'Central' } })
    await waitFor(() => expect(mocks.listarCotizaciones).toHaveBeenCalledWith(expect.objectContaining({ q: 'Central', pagina: 1 })))
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'BORRADOR' } })
    await waitFor(() => expect(mocks.listarCotizaciones).toHaveBeenCalledWith(expect.objectContaining({ estado: 'BORRADOR' })))
    fireEvent.change(screen.getByLabelText('Filtrar por cliente'), { target: { value: '5' } })
    await waitFor(() => expect(mocks.listarCotizaciones).toHaveBeenCalledWith(expect.objectContaining({ clienteId: 5, pagina: 1 })))
  })

  it('crea con selección de catálogos y reusa la misma key si el payload idéntico se reintenta', async () => {
    mocks.crearCotizacion.mockRejectedValueOnce(new Error('Temporal'))
    render(<CotizacionesPage />); await screen.findByRole('cell', { name: 'Taller Central' }); fireEvent.click(screen.getByRole('button', { name: 'Nueva cotización' }))
    await screen.findByRole('option', { name: 'MANT-1 · Mantenimiento (servicio)' })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '5' } }); fireEvent.change(screen.getByLabelText('Concepto línea 1'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Vence en'), { target: { value: '2026-12-01T12:00' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva cotización' }))
    await screen.findByText('Temporal')
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva cotización' }))
    await waitFor(() => expect(mocks.crearCotizacion).toHaveBeenCalledTimes(2))
    expect(mocks.crearCotizacion.mock.calls[0][1]).toBe('uuid-intencion')
    expect(mocks.crearCotizacion.mock.calls[1][1]).toBe('uuid-intencion')
    expect(mocks.crearCotizacion.mock.calls[1][0]).toEqual(expect.objectContaining({ clienteId: 5, lineas: [{ conceptoId: 10, cantidad: '1', descuento: '0' }] }))
  })

  it('edita sin líneas por defecto y permite reemplazo explícito con aviso de reprecificación', async () => {
    render(<CotizacionesPage />); await screen.findByRole('cell', { name: 'Taller Central' }); fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    await screen.findByText('Total: C$ 125.00'); fireEvent.click(screen.getByRole('button', { name: 'Editar borrador' }))
    fireEvent.change(screen.getByLabelText('Nota interna'), { target: { value: 'Ajuste solicitado' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Editar cotización' }))
    await waitFor(() => expect(mocks.actualizarCotizacion).toHaveBeenCalledWith(41, expect.not.objectContaining({ lineas: expect.anything() })))
    fireEvent.click(screen.getByRole('button', { name: 'Editar borrador' }))
    fireEvent.click(screen.getByText(/Reemplazar líneas y volver a resolver las tarifas/)); fireEvent.submit(screen.getByRole('form', { name: 'Editar cotización' }))
    await waitFor(() => expect(mocks.actualizarCotizacion).toHaveBeenLastCalledWith(41, expect.objectContaining({ lineas: [{ conceptoId: 10, cantidad: '1.000', descuento: '0.00' }] })))
  })

  it('oculta acciones no permitidas y no expone conversión de venta en esta fase', async () => {
    mocks.listarCotizaciones.mockResolvedValue(page([{ ...quote, accionesPermitidas: { editar: false, enviar: false, decidir: false, convertirVenta: true } }]))
    render(<CotizacionesPage />); await screen.findByRole('cell', { name: 'Taller Central' })
    fireEvent.click(screen.getByText('⋮'))
    expect(screen.queryByRole('button', { name: 'Editar borrador' })).toBeNull()
    expect(screen.queryByRole('button', { name: /venta/i })).toBeNull()
  })

  it('conserva y reintenta la misma nota tras error; al guardar la cierra y muestra el resultado del POST', async () => {
    mocks.agregarNotaCotizacion.mockRejectedValueOnce(new Error('Conflicto, vuelve a intentar.'))
      .mockResolvedValueOnce({ ...quote, notas: [{ id: 7, texto: 'Validar precio con ventas', autor: { id: 1, nombre: 'Ana' }, creadaEn: '2026-10-20T12:00:00Z' }] })
    render(<CotizacionesPage />); await screen.findByRole('cell', { name: 'Taller Central' })
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' })); await screen.findByText('Total: C$ 125.00')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir nota interna' }))
    fireEvent.change(screen.getByLabelText('Agregar nota interna'), { target: { value: 'Validar precio con ventas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Conflicto, vuelve a intentar.')
    expect((screen.getByLabelText('Agregar nota interna') as HTMLTextAreaElement).value).toBe('Validar precio con ventas')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))
    expect(await screen.findByText('Validar precio con ventas')).toBeTruthy()
    expect(screen.queryByLabelText('Agregar nota interna')).toBeNull()
    expect(mocks.agregarNotaCotizacion.mock.calls.map(call => call[2])).toEqual(['uuid-intencion', 'uuid-intencion'])
  })
})
