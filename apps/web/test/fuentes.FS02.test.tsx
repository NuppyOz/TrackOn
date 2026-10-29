import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { ComprobantesPage } from '../src/features/fuentes-gerenciales/finanzas/documentos/ComprobantesPage'
import { FacturablesPage } from '../src/features/fuentes-gerenciales/finanzas/facturables/FacturablesPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))

const apiMock = vi.mocked(api)
const page = { items: [], pagina: 1, limite: 25, hayMas: false }
describe('FS02 documentos y servicios realizados', () => {
  beforeEach(() => apiMock.mockReset())
  afterEach(cleanup)

  it('muestra la lista primero y abre un formulario dedicado de comprobante externo', async () => {
    apiMock.mockResolvedValue(page)
    render(<ComprobantesPage />)
    expect(await screen.findByText('No hay comprobantes registrados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar comprobante' }))
    expect(screen.getByRole('heading', { name: 'Registrar comprobante externo' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(/No emite facturas fiscales/i)).toBeTruthy()
  })

  it('conserva el formulario y la clave de intención al reintentar un conflicto', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST') throw new ApiError('Referencia ya registrada.', 409)
      return page as never
    })
    render(<ComprobantesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar comprobante' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia externa'), { target: { value: ' ext-42 ' } })
    fireEvent.change(screen.getByLabelText('Emisor'), { target: { value: ' proveedor ' } })
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Vence'), { target: { value: '2026-10-15T10:00' } })
    fireEvent.change(screen.getByLabelText('Importe final (NIO)'), { target: { value: '10.00' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Trabajo externo' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '10.00' } })
    const save = screen.getByRole('button', { name: 'Registrar comprobante' })
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Referencia ya registrada'))
    const first = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST')?.[1]?.headers as Record<string, string>
    fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST')).toHaveLength(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST')
    expect((posts[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe(first['Idempotency-Key'])
    expect((screen.getByLabelText('Referencia externa') as HTMLInputElement).value).toBe(' ext-42 ')
  })

  it('presenta el registro de servicios sin generar registros desde ventas', async () => {
    apiMock.mockResolvedValue(page)
    render(<FacturablesPage />)
    expect(await screen.findByText('No hay servicios registrados')).toBeTruthy()
    expect(screen.getByText(/La venta no registra servicios automáticamente/i)).toBeTruthy()
  })

  it('exige una línea compatible cuando se elige vincular una venta', async () => {
    const concept = { id: 7, codigo: 'SRV-7', tipo: 'SERVICIO', nombre: 'Diagnóstico', unidad: 'hora', servicioId: null, materialId: null, activo: true, version: 1, creadoEn: '', actualizadoEn: '' }
    const sale = { id: 20, cotizacionId: 30, clienteId: 4, clienteNombreRegistrado: 'Ana Ruiz', moneda: 'NIO', total: '80.00', confirmadaEn: '2026-10-01T12:00:00.000Z' }
    const quote = { lineas: [{ id: 31, posicion: 1, conceptoId: 7, descripcion: 'Diagnóstico', tipo: 'SERVICIO', unidad: 'hora', cantidad: '2.000', precio: '40.00', descuento: '0.00', subtotal: '80.00', total: '80.00' }] }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url !== 'string') return page as never
      if (url.startsWith('/api/comercial/conceptos?')) return { items: [concept], pagina: 1, limite: 25, hayMas: false } as never
      if (url.startsWith('/api/comercial/ventas?')) return { items: [sale], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/comercial/ventas/20') return { ...sale, lineas: [] } as never
      if (url === '/api/comercial/cotizaciones/30') return quote as never
      if (url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST') return { id: 50 } as never
      return page as never
    })
    render(<FacturablesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar servicio' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    await screen.findByRole('option', { name: /SRV-7 · Diagnóstico/ })
    fireEvent.change(screen.getByLabelText('Concepto de servicio'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'SRV-EXT-1' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(await screen.findByLabelText('Cantidad realizada (hora)'), { target: { value: '1.000' } })
    const save = screen.getByRole('button', { name: 'Registrar servicio' })
    await waitFor(() => expect((screen.getByLabelText('Venta del mismo cliente') as HTMLSelectElement).options.length).toBeGreaterThan(1))
    fireEvent.change(screen.getByLabelText('Venta del mismo cliente'), { target: { value: '20' } })
    await waitFor(() => expect(screen.getByLabelText('Línea vendida compatible')).toBeTruthy())
    expect(save.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Línea vendida compatible'), { target: { value: '31' } })
    expect(save.hasAttribute('disabled')).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ clienteId: 4, conceptoId: 7, ventaId: 20, lineaCotizacionId: 31, cantidad: '1.000' })
  })
})
