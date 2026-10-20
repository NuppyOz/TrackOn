import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CotizacionesPage } from '../src/features/comercial/cotizaciones/CotizacionesPage'
import { VentasPage } from '../src/features/comercial/ventas/VentasPage'
import { HistorialComercialPanel } from '../src/features/comercial/crm/HistorialComercialPanel'

const mocks = vi.hoisted(() => ({
  listarCotizaciones: vi.fn(), obtenerCotizacion: vi.fn(), convertirCotizacionEnVenta: vi.fn(),
  listarVentas: vi.fn(), obtenerVenta: vi.fn(), listarClientes: vi.fn(), api: vi.fn(),
}))
vi.mock('../src/features/comercial/cotizaciones/cotizaciones.api', () => ({
  listarCotizaciones: mocks.listarCotizaciones, obtenerCotizacion: mocks.obtenerCotizacion,
  agregarNotaCotizacion: vi.fn(), actualizarCotizacion: vi.fn(), crearCotizacion: vi.fn(), decidirCotizacion: vi.fn(), enviarCotizacion: vi.fn(),
}))
vi.mock('../src/features/comercial/ventas/ventas.api', () => ({ listarVentas: mocks.listarVentas, obtenerVenta: mocks.obtenerVenta, convertirCotizacionEnVenta: mocks.convertirCotizacionEnVenta }))
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: mocks.listarClientes }))
vi.mock('../src/shared/api', () => ({ api: mocks.api }))

const quote = {
  id: 8, clienteId: 3, clienteNombreRegistrado: 'Taller Central', clienteIdentificacionRegistrada: null, contactoId: null,
  estadoPersistido: 'APROBADA', estadoEfectivo: 'APROBADA', subtotal: '1250.00', descuento: '0.00', total: '1250.00', moneda: 'NIO',
  venceEn: '2026-12-31T00:00:00Z', version: 4, creadaEn: '2026-10-20T10:00:00Z', actualizadaEn: '2026-10-20T10:00:00Z',
  enviadaEn: '2026-10-20T10:00:00Z', decididaEn: '2026-10-20T10:00:00Z', ventaId: null, nota: null, creadaPorId: 1,
  decisionOrigen: 'INTERNO', decisionComentario: null, lineas: [{ id: 1, posicion: 1, conceptoId: 2, descripcion: 'Servicio', tipo: 'SERVICIO', unidad: 'servicio', cantidad: '1.000', precio: '1250.00', descuento: '0.00', subtotal: '1250.00', total: '1250.00' }],
  notas: [], accionesPermitidas: { editar: false, enviar: false, decidir: false, convertirVenta: true },
} as const
const resumen = { id: 12, cotizacionId: 8, clienteId: 3, clienteNombreRegistrado: 'Taller Central', moneda: 'NIO', total: '1250.00', confirmadaEn: '2026-10-20T12:00:00Z' } as const
const paged = <T,>(items: T[] = []) => ({ items, pagina: 1, limite: 25, hayMas: false })

describe('FE04 ventas e historial comercial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'intencion-conversion-1') })
    mocks.listarCotizaciones.mockResolvedValue(paged([{ ...quote, accionesPermitidas: quote.accionesPermitidas }]))
    mocks.obtenerCotizacion.mockResolvedValue(quote)
    mocks.convertirCotizacionEnVenta.mockResolvedValue(resumen)
    mocks.listarVentas.mockResolvedValue(paged([resumen]))
    mocks.obtenerVenta.mockResolvedValue({ ...resumen, confirmadaPor: { id: 1, nombre: 'Ana' }, lineas: [{ id: 9, descripcion: 'Servicio', tipo: 'SERVICIO', unidad: 'servicio', cantidad: '1.005', precio: '99999999999999.99', descuento: '0.00', subtotal: '99999999999999.99', total: '99999999999999.99' }] })
    mocks.listarClientes.mockResolvedValue([])
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('convierte con clave de intención, refresca la cotización y presenta el DTO de venta aparte', async () => {
    const approved = { ...quote, accionesPermitidas: { ...quote.accionesPermitidas, convertirVenta: true } }
    mocks.listarCotizaciones.mockResolvedValue(paged([approved]))
    mocks.obtenerCotizacion.mockResolvedValue({ ...approved, ventaId: 12, accionesPermitidas: { ...approved.accionesPermitidas, convertirVenta: false } })
    render(<CotizacionesPage />)
    await screen.findByRole('cell', { name: 'Taller Central' })
    fireEvent.click(screen.getByText('⋮'))
    fireEvent.click(screen.getByRole('button', { name: 'Convertir a venta' }))
    await waitFor(() => expect(mocks.convertirCotizacionEnVenta).toHaveBeenCalledWith(8, 4, 'intencion-conversion-1'))
    expect(await screen.findByText(/Venta registrada\. La facturación se registra por separado\./)).toBeTruthy()
    expect(await screen.findByText(/V-12 · Taller Central/)).toBeTruthy()
    expect(mocks.obtenerCotizacion).toHaveBeenCalledTimes(1)
  })

  it('muestra decimales exactos de la venta, incluidos los máximos del DTO', async () => {
    render(<VentasPage ventaInicialId={12} />)
    expect((await screen.findAllByText(/C\$ 99,999,999,999,999\.99/)).length).toBe(3)
    expect(screen.getByText('1.005')).toBeTruthy()
    expect(screen.getByText('Ana')).toBeTruthy()
  })

  it('consulta historial por tipo y pagina, e identifica su alcance comercial', async () => {
    mocks.api.mockResolvedValue({ ...paged([{ id: 'VENTA:12', tipo: 'VENTA', fecha: '2026-10-20T12:00:00Z', titulo: 'Venta V-12', descripcion: 'Cotización C-8', referenciaId: 12 }]), alcance: 'COMERCIAL' })
    render(<HistorialComercialPanel clienteId={3} />)
    expect(await screen.findByText('Venta V-12')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Filtrar historial por tipo'), { target: { value: 'VENTA' } })
    await waitFor(() => expect(mocks.api).toHaveBeenLastCalledWith(expect.stringContaining('/api/comercial/clientes/3/historial?pagina=1&limite=25&tipo=VENTA')))
    expect(screen.getByText(/no incluye servicios, finanzas ni contratos/i)).toBeTruthy()
  })
})
