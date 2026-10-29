import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TarifasPage } from '../src/features/comercial/tarifas/TarifasPage'

const mocks = vi.hoisted(() => ({
  listarConceptos: vi.fn(), crearConcepto: vi.fn(), actualizarConcepto: vi.fn(), listarTarifas: vi.fn(), crearTarifa: vi.fn(),
  cambiarEstadoTarifa: vi.fn(), resolverPrecio: vi.fn(), listarClientes: vi.fn(),
}))
vi.mock('../src/features/comercial/tarifas/tarifas.api', () => mocks)
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: mocks.listarClientes }))

const concepto = { id: 10, codigo: 'MANT-1', tipo: 'SERVICIO', nombre: 'Mantenimiento', unidad: 'servicio', servicioId: null, materialId: null, activo: true, version: 1, creadoEn: '2026-10-20T10:00:00Z', actualizadoEn: '2026-10-20T10:00:00Z' } as const
const tarifa = { id: 4, conceptoId: 10, clienteId: null, moneda: 'NIO', precio: '1250.00', activo: true, version: 1, creadaEn: '2026-10-20T10:00:00Z', concepto: { id: 10, codigo: 'MANT-1', tipo: 'SERVICIO', nombre: 'Mantenimiento', unidad: 'servicio' } } as const
const page = <T,>(items: T[] = []) => ({ items, pagina: 1, limite: 25, hayMas: false })

describe('TarifasPage FE02', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listarConceptos.mockResolvedValue(page([concepto]))
    mocks.listarTarifas.mockResolvedValue(page([tarifa]))
    mocks.crearConcepto.mockResolvedValue(concepto)
    mocks.actualizarConcepto.mockResolvedValue(concepto)
    mocks.crearTarifa.mockResolvedValue(tarifa)
    mocks.cambiarEstadoTarifa.mockResolvedValue({ ...tarifa, activo: false })
    mocks.resolverPrecio.mockResolvedValue({ tarifaId: 4, conceptoId: 10, clienteIdSolicitado: 5, origen: 'ESTANDAR', moneda: 'NIO', precio: '1250.00' })
    mocks.listarClientes.mockResolvedValue([{ id: 5, codigo: 'C-05', activo: true, telefonoComercial: null, correoComercial: null, persona: null, organizacion: { razonSocial: 'Taller Central', nombreComercial: null, identificacionTributaria: null } }])
  })
  afterEach(cleanup)

  it('carga la tabla primero y solicita búsqueda, filtros, orden y paginación al backend', async () => {
    render(<TarifasPage />)
    expect(await screen.findByText('MANT-1')).toBeTruthy()
    expect(mocks.listarConceptos).toHaveBeenCalledWith(expect.objectContaining({ estado: 'todos', pagina: 1, limite: 25, sortBy: 'nombre', sortDir: 'asc' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'mantenimiento' } })
    await waitFor(() => expect(mocks.listarConceptos).toHaveBeenCalledWith(expect.objectContaining({ q: 'mantenimiento', pagina: 1 })))
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'todos' } })
    await waitFor(() => expect(mocks.listarConceptos).toHaveBeenCalledWith(expect.objectContaining({ estado: 'todos' })))
  })

  it('crea tarifa estándar sin mostrar un campo ID al usuario', async () => {
    render(<TarifasPage />)
    await screen.findByText('MANT-1')
    fireEvent.click(screen.getByRole('tab', { name: 'Tarifas' }))
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/ }))
    const form = screen.getByRole('form', { name: 'Nueva tarifa' })
    await screen.findByRole('option', { name: 'MANT-1 · Mantenimiento' })
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '' } })
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1250.5' } })
    fireEvent.submit(form)
    await waitFor(() => expect(mocks.crearTarifa).toHaveBeenCalledWith({ conceptoId: 10, clienteId: null, moneda: 'NIO', precio: '1250.5' }))
    expect(form.querySelector('input[name="conceptoId"]')).toBeNull()
  })

  it('recarga tarifas al crear desde la sección Tarifas y conserva consulta de conceptos paginada', async () => {
    render(<TarifasPage />)
    await screen.findByText('MANT-1')
    fireEvent.click(screen.getByRole('tab', { name: 'Tarifas' }))
    await screen.findByText('Tarifas registradas')
    fireEvent.click(screen.getByRole('button', { name: /Nueva tarifa/ }))
    await screen.findByRole('option', { name: 'MANT-1 · Mantenimiento' })
    fireEvent.change(screen.getByLabelText('Buscar concepto'), { target: { value: 'mant' } })
    await waitFor(() => expect(mocks.listarConceptos).toHaveBeenCalledWith(expect.objectContaining({ q: 'mant', estado: 'activos', pagina: 1, limite: 25 })))
    fireEvent.change(screen.getByLabelText('Concepto'), { target: { value: '10' } })
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0.01' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Nueva tarifa' }))
    await waitFor(() => expect(mocks.listarTarifas).toHaveBeenLastCalledWith({ estado: 'todos', pagina: 1, limite: 25, sortBy: 'creadaEn', sortDir: 'desc' }))
    expect(await screen.findByText('Tarifas registradas')).toBeTruthy()
  })

  it('resuelve el precio con la API y muestra si proviene de la tarifa estándar', async () => {
    render(<TarifasPage />)
    await screen.findByText('MANT-1')
    fireEvent.click(screen.getByText('•••'))
    fireEvent.click(screen.getByText('•••'))
    fireEvent.click(screen.getByRole('button', { name: 'Resolver precio' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar precio' }))
    expect(await screen.findByText(/Tarifa estándar/)).toBeTruthy()
    expect(mocks.resolverPrecio).toHaveBeenCalledWith(10, 5)
    expect(screen.getByText((_, element) => element?.classList.contains('tarifas__resolved') ?? false).textContent).toContain('1,250.00')
  })

  it('presenta el máximo Decimal16,2 sin convertirlo a número flotante', async () => {
    mocks.resolverPrecio.mockResolvedValueOnce({ tarifaId: 4, conceptoId: 10, clienteIdSolicitado: 5, origen: 'CLIENTE', moneda: 'NIO', precio: '99999999999999.99' })
    render(<TarifasPage />)
    await screen.findByText('MANT-1')
    fireEvent.click(screen.getByText('•••'))
    fireEvent.click(screen.getByRole('button', { name: 'Resolver precio' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar precio' }))
    expect(await screen.findByText(/99,999,999,999,999\.99/)).toBeTruthy()
  })

  it('conserva un conflicto de versión aunque la tabla se recargue', async () => {
    mocks.actualizarConcepto.mockRejectedValueOnce(new Error('El concepto cambió. Actualiza los datos antes de volver a guardar.'))
    render(<TarifasPage />)
    await screen.findByText('MANT-1')
    fireEvent.click(screen.getByText('•••'))
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar concepto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    const error = await screen.findByRole('alert')
    expect(error.textContent).toContain('El concepto cambió')
    await waitFor(() => expect(mocks.listarConceptos).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('alert').textContent).toContain('El concepto cambió')
  })
})
