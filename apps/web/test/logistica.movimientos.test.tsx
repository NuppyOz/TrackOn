import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MovimientosPage } from '../src/features/fuentes-gerenciales/logistica/movimientos/MovimientosPage'
import { listarArticulos } from '../src/features/fuentes-gerenciales/logistica/articulos/articulos.api'
import { listarOrdenes } from '../src/features/ordenes/ordenes.api'
import { crearMovimiento, listarMovimientos, obtenerMovimiento, revertirMovimiento } from '../src/features/fuentes-gerenciales/logistica/movimientos/movimientos.api'

vi.mock('../src/features/fuentes-gerenciales/logistica/articulos/articulos.api', () => ({ listarArticulos: vi.fn() }))
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: vi.fn() }))
vi.mock('../src/features/fuentes-gerenciales/logistica/movimientos/movimientos.api', () => ({
  crearMovimiento: vi.fn(), listarMovimientos: vi.fn(), obtenerMovimiento: vi.fn(), revertirMovimiento: vi.fn(),
}))

const emptyPage = { items: [], pagina: 1, limite: 25, hayMas: false }
const article = { id: 7, codigo: 'ART-7', nombre: 'Filtro', unidad: 'unidad', minimo: '0.000', saldoCantidad: '8.000', saldoValor: '80.000000', costoPromedio: '10.000000', ultimaFecha: '2026-10-01T15:00:00.000Z', version: 2, materialId: null, creadoEn: '2026-10-01T12:00:00.000Z' }
const movement = { id: 11, articuloId: 7, articuloCodigo: 'ART-7', articuloNombre: 'Filtro', unidad: 'unidad', tipo: 'ENTRADA' as const, sentido: 1 as const, cantidad: '2.000', valor: '20.000000', saldoCantidad: '10.000', saldoValor: '100.000000', referencia: 'ENT-11', fechaEfectiva: '2026-10-20T15:00:00.000Z', registradoEn: '2026-10-20T15:05:00.000Z', observacion: 'Compra', origenId: null, ordenId: null, puedeRevertir: true }
const consumption = { ...movement, id: 12, tipo: 'CONSUMO' as const, sentido: -1 as const, referencia: 'CON-12', cantidad: '1.000', valor: '10.000000', puedeRevertir: false }

const listMock = vi.mocked(listarMovimientos)
const articlesMock = vi.mocked(listarArticulos)
const ordersMock = vi.mocked(listarOrdenes)
const getMock = vi.mocked(obtenerMovimiento)
const createMock = vi.mocked(crearMovimiento)
const reverseMock = vi.mocked(revertirMovimiento)

describe('movimientos logísticos', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'movement-key') })
    listMock.mockReset().mockResolvedValue({ ...emptyPage, items: [movement, consumption] })
    articlesMock.mockReset().mockResolvedValue({ ...emptyPage, items: [article] })
    ordersMock.mockReset().mockResolvedValue(emptyPage)
    getMock.mockReset().mockResolvedValue(movement)
    createMock.mockReset().mockResolvedValue(movement)
    reverseMock.mockReset().mockResolvedValue({ ...movement, id: 13, tipo: 'REVERSO', sentido: -1, referencia: 'REV-11', puedeRevertir: false })
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('lista, busca, pagina, abre el detalle y registra una reversión', async () => {
    const busy = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MovimientosPage onBusyChange={busy} />)

    fireEvent.change(await screen.findByLabelText('Buscar movimientos'), { target: { value: ' filtro ' } })
    await waitFor(() => expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ q: 'filtro' })))
    fireEvent.click(screen.getByRole('button', { name: 'ENT-11' }))
    expect(await screen.findByText('Filtro · unidad')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revertir movimiento' }))
    fireEvent.change(screen.getByLabelText('Referencia del reverso'), { target: { value: ' rev-11 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-21T09:00:00' } })
    fireEvent.change(screen.getByLabelText('Motivo / observación'), { target: { value: ' corrección de inventario ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reversión' }))

    await waitFor(() => expect(reverseMock).toHaveBeenCalledWith(11, expect.objectContaining({ referencia: 'REV-11', observacion: 'corrección de inventario' }), 'movement-key'))
    expect(await screen.findByText('El reverso quedó registrado como un movimiento nuevo.')).toBeTruthy()
    expect(busy).toHaveBeenCalledWith(true)
    expect(busy).toHaveBeenLastCalledWith(false)
  })

  it('valida el formulario y registra una entrada normalizada', async () => {
    render(<MovimientosPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar movimiento' }))
    fireEvent.submit(screen.getByLabelText('Nuevo movimiento'))
    expect((await screen.findByRole('alert')).textContent).toContain('Completa artículo')

    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' ent-11 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-20T09:00:00' } })
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '2.125' } })
    fireEvent.change(screen.getByLabelText(/Costo unitario/), { target: { value: '10.123456' } })
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: ' ingreso de compra ' } })
    fireEvent.submit(screen.getByLabelText('Nuevo movimiento'))

    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ articuloId: 7, tipo: 'ENTRADA', referencia: 'ENT-11', cantidad: '2.125', costoUnitario: '10.123456', observacion: 'ingreso de compra' }), 'movement-key'))
    expect(await screen.findByText(/Movimiento registrado/)).toBeTruthy()
  })

  it('vincula un consumo a una orden y exige el consumo de origen en devoluciones', async () => {
    const order = { id: 21, numero: 'OT-21', ubicacionId: 1, estadoCodigo: 'ASIGNADA' as const, solicitud: 'Servicio', prioridad: 'ALTA' as const, fechaProgramada: null, creadaEn: '', actualizadaEn: '', cerradaEn: null, version: 1, clienteNombreRegistrado: 'Cliente', ubicacionNombreRegistrado: 'Planta', direccionRegistrada: 'Managua' }
    ordersMock.mockResolvedValue({ ...emptyPage, items: [order] })
    createMock.mockResolvedValue({ ...consumption, ordenId: 21 })
    render(<MovimientosPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar movimiento' }))
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'DEVOLUCION' } })
    await waitFor(() => expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ articuloId: 7 })))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'DEV-1' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-21T09:00:00' } })
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: 'Devolución' } })
    fireEvent.submit(screen.getByLabelText('Nuevo movimiento'))
    expect((await screen.findByRole('alert')).textContent).toContain('Selecciona un consumo')

    fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'CONSUMO' } })
    await screen.findByRole('option', { name: /OT-21/ })
    fireEvent.change(screen.getByLabelText('Orden de trabajo'), { target: { value: '21' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CON-21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }))
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'CONSUMO', ordenId: 21 }), expect.any(String)))
  })

  it('muestra errores de carga y abre un movimiento indicado en la URL', async () => {
    listMock.mockRejectedValueOnce(new Error('No fue posible listar'))
    window.history.replaceState({}, '', '/?movimientoId=11')
    render(<MovimientosPage />)
    expect(await screen.findByText('No fue posible listar')).toBeTruthy()
    await waitFor(() => expect(getMock).toHaveBeenCalledWith(11))
    expect(await screen.findByText('Filtro · unidad')).toBeTruthy()
  })
})
