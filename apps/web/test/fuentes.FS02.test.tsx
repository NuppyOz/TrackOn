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

  it('registra un comprobante con líneas y normaliza los datos antes de enviarlos', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST') return { id: 43 } as never
      return page as never
    })
    render(<ComprobantesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar comprobante' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia externa'), { target: { value: ' ext-43 ' } })
    fireEvent.change(screen.getByLabelText('Emisor'), { target: { value: ' proveedor ' } })
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2027-01-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Vence'), { target: { value: '2027-02-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Importe final (NIO)'), { target: { value: '25.50' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: ' Mano de obra ' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '25.50' } })
    const save = screen.getByRole('button', { name: 'Registrar comprobante' })
    expect(save.hasAttribute('disabled')).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/finanzas/comprobantes', expect.objectContaining({ method: 'POST' })))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ clienteId: 4, referencia: 'EXT-43', emisor: 'PROVEEDOR', importeFinal: '25.50', lineas: [{ descripcion: 'Mano de obra', importe: '25.50' }] })
    expect(await screen.findByText('No hay comprobantes registrados')).toBeTruthy()
  })

  it('valida fechas, suma y precisión de líneas, y conserva el formulario ante errores desconocidos', async () => {
    let failCreate = true
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes' && init?.method === 'POST') {
        if (failCreate) throw 'fallo inesperado'
        return { id: 44 } as never
      }
      return page as never
    })
    render(<ComprobantesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar comprobante' }))
    const save = screen.getByRole('button', { name: 'Registrar comprobante' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia externa'), { target: { value: 'EXT-44' } })
    fireEvent.change(screen.getByLabelText('Emisor'), { target: { value: 'Proveedor' } })
    fireEvent.change(screen.getByLabelText('Fecha de emisión'), { target: { value: '2026-10-10T10:00' } })
    fireEvent.change(screen.getByLabelText('Vence'), { target: { value: '2026-10-09T10:00' } })
    fireEvent.change(screen.getByLabelText('Importe final (NIO)'), { target: { value: '25.50' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Servicio' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '25.500' } })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Vence'), { target: { value: '2026-10-11T10:00' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '25.49' } })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '25.50' } })
    expect((save as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }))
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getAllByLabelText('Descripción')[1], { target: { value: 'Parte adicional' } })
    fireEvent.change(screen.getAllByLabelText('Importe (NIO)')[1], { target: { value: '0.00' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar línea' })[1])
    expect((save as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(save)
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo completar la operación.')
    expect((screen.getByLabelText('Referencia externa') as HTMLInputElement).value).toBe('EXT-44')
    failCreate = false
    fireEvent.click(save)
    expect(await screen.findByText('No hay comprobantes registrados')).toBeTruthy()
  })

  it('muestra detalle con pagos y permite anular el comprobante sin saldo aplicado', async () => {
    const invoice = { id: 43, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'EXT-43', emisor: 'PROVEEDOR', emitidaEn: '2027-01-10T16:00:00.000Z', venceEn: '2027-02-10T16:00:00.000Z', importeFinal: '25.50', moneda: 'NIO' as const, anuladaEn: null, motivoAnulacion: null, registradoEn: '2027-01-10T16:00:00.000Z', observacion: 'Servicio externo', version: 2, saldo: '25.50', lineas: [{ id: 1, descripcion: 'Mano de obra', importe: '25.50', ordenId: null, conceptoId: 7 }], aplicaciones: [{ id: 5, cobroId: 11, referencia: 'COB-11', importe: '0.00', fechaEfectiva: '2027-01-11T16:00:00.000Z', revertidoEn: null }] }
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes/43/anular' && init?.method === 'POST') return { ...invoice, anuladaEn: '2027-01-12T16:00:00.000Z', motivoAnulacion: 'Duplicado', saldo: '0.00' } as never
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes/43') return invoice as never
      return page as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?comprobanteId=43')
    try {
      render(<ComprobantesPage />)
      expect(await screen.findByRole('heading', { name: 'EXT-43 · Ana Ruiz' })).toBeTruthy()
      expect(screen.getByText('Mano de obra')).toBeTruthy()
      expect(screen.getByText('COB-11')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Anular comprobante' }))
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Duplicado' } })
      fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
      await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes/43/anular' && init?.method === 'POST')).toBe(true))
      const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes/43/anular' && init?.method === 'POST')
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ version: 2, motivo: 'Duplicado' })
      expect(await screen.findByText('Motivo de anulación: Duplicado')).toBeTruthy()
    } finally { window.history.replaceState({}, '', previous) }
  })

  it('presenta un comprobante anulado sin pagos ni líneas y oculta acciones de anulación', async () => {
    const annulled = { id: 46, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'EXT-46', emisor: 'PROVEEDOR', emitidaEn: '2027-01-10T16:00:00.000Z', venceEn: '2027-02-10T16:00:00.000Z', importeFinal: '25.50', moneda: 'NIO' as const, anuladaEn: '2027-01-12T16:00:00.000Z', motivoAnulacion: 'Duplicado', registradoEn: '2027-01-10T16:00:00.000Z', observacion: null, version: 2, saldo: '0.00', lineas: [], aplicaciones: [] }
    apiMock.mockImplementation(async url => url === '/api/fuentes-gerenciales/finanzas/comprobantes/46' ? annulled as never : page as never)
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?comprobanteId=46')
    try {
      render(<ComprobantesPage />)
      expect(await screen.findByRole('heading', { name: 'EXT-46 · Ana Ruiz' })).toBeTruthy()
      expect(screen.getAllByText('Anulado').length).toBeGreaterThan(0)
      expect(screen.getByText('Sin observación')).toBeTruthy()
      expect(screen.getByText('Motivo de anulación: Duplicado')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Anular comprobante' })).toBeNull()
      expect(screen.queryByText('Pagos asociados')).toBeNull()
    } finally { window.history.replaceState({}, '', previous) }
  })

  it('presenta el registro de servicios sin generar registros desde ventas', async () => {
    apiMock.mockResolvedValue(page)
    render(<FacturablesPage />)
    expect(await screen.findByText('No hay servicios registrados')).toBeTruthy()
    expect(screen.getByText(/La venta no registra servicios automáticamente/i)).toBeTruthy()
  })

  it('muestra los caminos vacíos del detalle sin ofrecer aplicación cuando la cantidad pendiente es cero', async () => {
    const service = {
      id: 72, clienteId: 4, clienteNombre: 'Ana Ruiz', conceptoId: 7, conceptoNombre: 'Diagnóstico', unidad: 'hora',
      referencia: 'SRV-72', cantidad: '1.000', pendiente: '0.000', fechaEfectiva: '2026-10-01T16:00:00.000Z',
      ordenId: null, ventaId: null, lineaCotizacionId: null, registradoEn: '2026-10-01T16:00:00.000Z',
      observacion: null, aplicaciones: [{ id: 2, comprobanteReferencia: 'EXT-44', cantidad: '1.000', fechaEfectiva: '2026-10-02T16:00:00.000Z', comprobanteAnuladaEn: '2026-10-03T16:00:00.000Z' }],
    }
    apiMock.mockImplementation(async (url) => url === '/api/fuentes-gerenciales/finanzas/facturables/72' ? service as never : page as never)
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?facturableId=72')
    try {
      render(<FacturablesPage />)
      expect(await screen.findByRole('heading', { name: 'SRV-72 · Ana Ruiz' })).toBeTruthy()
      expect(screen.getByText('Aplicado')).toBeTruthy()
      expect(screen.getByText('Sin orden vinculada')).toBeTruthy()
      expect(screen.getByText('Sin venta vinculada')).toBeTruthy()
      expect(screen.getByText('Sin observación')).toBeTruthy()
      expect(screen.getByText('Anulado')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Aplicar a comprobante' })).toBeNull()
    } finally { window.history.replaceState({}, '', previous) }
  })

  it('reintenta la consulta de servicios después de un error del servidor', async () => {
    let requests = 0
    apiMock.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/facturables?') && requests++ === 0) throw new Error('Servicio temporalmente no disponible')
      return page as never
    })
    render(<FacturablesPage />)
    expect((await screen.findAllByText('Servicio temporalmente no disponible')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay servicios registrados')).toBeTruthy()
  })

  it('filtra clientes por código, recupera errores de conceptos y cancela el alta', async () => {
    apiMock.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.startsWith('/api/comercial/conceptos?')) throw new Error('Conceptos temporalmente no disponibles')
      return page as never
    })
    render(<FacturablesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar servicio' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Conceptos temporalmente no disponibles')
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'CLI-4' } })
    expect(screen.getByRole('option', { name: /Ana Ruiz/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'sin coincidencias' } })
    expect(screen.queryByRole('option', { name: /Ana Ruiz/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('No hay servicios registrados')).toBeTruthy()
  })

  it('registra un servicio independiente y excluye conceptos que no son servicio ni mano de obra', async () => {
    let attempts = 0
    const concepts = [
      { id: 8, codigo: 'MO-8', tipo: 'MANO_OBRA', nombre: 'Instalación', unidad: 'hora', servicioId: null, materialId: null, activo: true, version: 1, creadoEn: '', actualizadoEn: '' },
      { id: 9, codigo: 'MAT-9', tipo: 'MATERIAL', nombre: 'Repuesto', unidad: 'unidad', servicioId: null, materialId: 9, activo: true, version: 1, creadoEn: '', actualizadoEn: '' },
    ]
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/comercial/conceptos?')) return { items: concepts, pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST') {
        attempts++
        if (attempts === 1) throw new Error('Error temporal')
        return { id: 51 } as never
      }
      return page as never
    })
    render(<FacturablesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar servicio' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    await screen.findByRole('option', { name: /MO-8 · Instalación/ })
    expect(screen.queryByRole('option', { name: /MAT-9 · Repuesto/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Concepto de servicio'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' MO-EXT-1 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(await screen.findByLabelText('Cantidad realizada (hora)'), { target: { value: '1.250' } })
    const save = screen.getByRole('button', { name: 'Registrar servicio' })
    expect(save.hasAttribute('disabled')).toBe(false)
    fireEvent.click(save)
    expect((await screen.findByRole('alert')).textContent).toContain('Error temporal')
    const first = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar servicio' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')).toBe(true))
    await waitFor(() => expect(attempts).toBe(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')
    const post = posts[1]
    expect((posts[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe((first?.[1]?.headers as Record<string, string>)['Idempotency-Key'])
    const body = JSON.parse(String(post?.[1]?.body))
    expect(body).toMatchObject({ clienteId: 4, conceptoId: 8, referencia: 'MO-EXT-1', cantidad: '1.250' })
    expect(body).not.toHaveProperty('ventaId')
    expect(body).not.toHaveProperty('ordenId')
  })

  it('exige una línea compatible cuando se elige vincular una venta', async () => {
    const concept = { id: 7, codigo: 'SRV-7', tipo: 'SERVICIO', nombre: 'Diagnóstico', unidad: 'hora', servicioId: null, materialId: null, activo: true, version: 1, creadoEn: '', actualizadoEn: '' }
    const sale = { id: 20, cotizacionId: 30, clienteId: 4, clienteNombreRegistrado: 'Ana Ruiz', moneda: 'NIO', total: '80.00', confirmadaEn: '2026-10-01T12:00:00.000Z' }
    const quote = { lineas: [
      { id: 31, posicion: 1, conceptoId: 7, descripcion: 'Diagnóstico', tipo: 'SERVICIO', unidad: 'hora', cantidad: '2.000', precio: '40.00', descuento: '0.00', subtotal: '80.00', total: '80.00' },
      { id: 32, posicion: 2, conceptoId: 7, descripcion: 'Material excluido', tipo: 'MATERIAL', unidad: 'unidad', cantidad: '1.000', precio: '1.00', descuento: '0.00', subtotal: '1.00', total: '1.00' },
      { id: 33, posicion: 3, conceptoId: 8, descripcion: 'Otro servicio', tipo: 'SERVICIO', unidad: 'hora', cantidad: '1.000', precio: '1.00', descuento: '0.00', subtotal: '1.00', total: '1.00' },
      { id: 34, posicion: 4, conceptoId: 7, descripcion: 'Mano de obra', tipo: 'MANO_OBRA', unidad: 'hora', cantidad: '1.000', precio: '1.00', descuento: '0.00', subtotal: '1.00', total: '1.00' },
    ] }
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
    expect(screen.queryByRole('option', { name: /Material excluido|Otro servicio/ })).toBeNull()
    expect(screen.getByRole('option', { name: /Mano de obra/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Línea vendida compatible'), { target: { value: '31' } })
    fireEvent.change(screen.getByLabelText('Cantidad realizada (hora)'), { target: { value: '3.000' } })
    expect(save.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Cantidad realizada (hora)'), { target: { value: '1.000' } })
    expect(save.hasAttribute('disabled')).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ clienteId: 4, conceptoId: 7, ventaId: 20, lineaCotizacionId: 31, cantidad: '1.000' })
  })

  it('muestra errores al cargar el detalle de venta y permite quitar el vínculo', async () => {
    const concept = { id: 7, codigo: 'SRV-7', tipo: 'SERVICIO', nombre: 'Diagnóstico', unidad: 'hora', servicioId: null, materialId: null, activo: true, version: 1, creadoEn: '', actualizadoEn: '' }
    const sale = { id: 20, cotizacionId: 30, clienteId: 4, clienteNombreRegistrado: 'Ana Ruiz', moneda: 'NIO', total: '80.00', confirmadaEn: '2026-10-01T12:00:00.000Z' }
    apiMock.mockImplementation(async (url) => {
      if (typeof url !== 'string') return page as never
      if (url.startsWith('/api/comercial/conceptos?')) return { items: [concept], pagina: 1, limite: 25, hayMas: false } as never
      if (url.startsWith('/api/comercial/ventas?')) return { items: [sale], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/comercial/ventas/20') throw new Error('No se pudo cargar la venta')
      return page as never
    })
    render(<FacturablesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar servicio' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(await screen.findByLabelText('Concepto de servicio'), { target: { value: '7' } })
    fireEvent.change(await screen.findByLabelText('Venta del mismo cliente'), { target: { value: '20' } })
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo cargar la venta')
    expect(screen.getByLabelText('Línea vendida compatible')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Venta del mismo cliente'), { target: { value: '' } })
    expect(screen.queryByLabelText('Línea vendida compatible')).toBeNull()
    expect(screen.queryByText('Cargando líneas de la cotización…')).toBeNull()
  })

  it('aplica cantidad pendiente solo a una línea del mismo concepto y conserva unidad', async () => {
    const service = { id: 50, clienteId: 4, clienteNombre: 'Ana Ruiz', conceptoId: 7, conceptoNombre: 'Diagnóstico', unidad: 'hora', referencia: 'SRV-50', cantidad: '2.000', pendiente: '2.000', fechaEfectiva: '2026-10-01T16:00:00.000Z', ordenId: null, ventaId: null, lineaCotizacionId: null, registradoEn: '2026-10-01T16:00:00.000Z', observacion: null, aplicaciones: [] }
    const invoice = { id: 44, clienteId: 4, referencia: 'EXT-44', emisor: 'PROVEEDOR', anuladaEn: null, saldo: '100.00', lineas: [{ id: 61, descripcion: 'Diagnóstico', conceptoId: 7, importe: '100.00' }, { id: 62, descripcion: 'Otro concepto', conceptoId: 8, importe: '20.00' }] }
    const otherClientInvoice = { ...invoice, id: 45, clienteId: 5, referencia: 'EXT-45' }
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/facturables/50' && !init?.method) return service as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/comprobantes?')) return { items: [invoice, otherClientInvoice], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes/44') return invoice as never
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes/45') return otherClientInvoice as never
      if (url === '/api/fuentes-gerenciales/finanzas/facturables/50/aplicar' && init?.method === 'POST') return { ...service, pendiente: '0.000', aplicaciones: [{ id: 1, comprobanteReferencia: 'EXT-44', cantidad: '2.000', fechaEfectiva: '2026-11-01T16:00:00.000Z', comprobanteAnuladaEn: null }] } as never
      return page as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?facturableId=50')
    try {
      render(<FacturablesPage />)
      expect(await screen.findByRole('heading', { name: 'SRV-50 · Ana Ruiz' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar a comprobante' }))
      fireEvent.change(await screen.findByLabelText('Comprobante'), { target: { value: '45' } })
      await waitFor(() => expect(apiMock.mock.calls.some(([url]) => url === '/api/fuentes-gerenciales/finanzas/comprobantes/45')).toBe(true))
      expect(screen.queryByRole('option', { name: 'Diagnóstico · C$ 100.00' })).toBeNull()
      fireEvent.change(await screen.findByLabelText('Comprobante'), { target: { value: '44' } })
      await screen.findByRole('option', { name: 'Diagnóstico · C$ 100.00' })
      expect(screen.queryByRole('option', { name: 'Otro concepto · C$ 20.00' })).toBeNull()
      fireEvent.change(screen.getByLabelText('Línea del comprobante'), { target: { value: '61' } })
      const apply = screen.getByRole('button', { name: 'Aplicar cantidad' })
      expect(apply.hasAttribute('disabled')).toBe(false)
      fireEvent.change(screen.getByLabelText('Cantidad a aplicar (hora)'), { target: { value: '3.000' } })
      expect(apply.hasAttribute('disabled')).toBe(true)
      fireEvent.change(screen.getByLabelText('Cantidad a aplicar (hora)'), { target: { value: '0' } })
      expect(apply.hasAttribute('disabled')).toBe(true)
      fireEvent.change(screen.getByLabelText('Cantidad a aplicar (hora)'), { target: { value: '2.000' } })
      expect(apply.hasAttribute('disabled')).toBe(false)
      fireEvent.click(apply)
      await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables/50/aplicar' && init?.method === 'POST')).toBe(true))
      const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/facturables/50/aplicar' && init?.method === 'POST')
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ lineaComprobanteId: 61, cantidad: '2.000' })
      expect(await screen.findByText('Aplicado')).toBeTruthy()
    } finally { window.history.replaceState({}, '', previous) }
  })

  it('recupera un fallo al consultar comprobante y permite limpiar el vínculo', async () => {
    const service = { id: 50, clienteId: 4, clienteNombre: 'Ana Ruiz', conceptoId: 7, conceptoNombre: 'Diagnóstico', unidad: 'hora', referencia: 'SRV-50', cantidad: '2.000', pendiente: '2.000', fechaEfectiva: '2026-10-01T16:00:00.000Z', ordenId: 10, ventaId: 20, lineaCotizacionId: 30, registradoEn: '2026-10-01T16:00:00.000Z', observacion: 'Revisión', aplicaciones: [] }
    const invoice = { id: 44, clienteId: 4, referencia: 'EXT-44', emisor: 'PROVEEDOR', anuladaEn: null, saldo: '100.00' }
    apiMock.mockImplementation(async url => {
      if (url === '/api/fuentes-gerenciales/finanzas/facturables/50') return service as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/comprobantes?')) return { items: [invoice], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/finanzas/comprobantes/44') throw 'fallo de red'
      return page as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?facturableId=50')
    try {
      render(<FacturablesPage />)
      expect(await screen.findByRole('heading', { name: 'SRV-50 · Ana Ruiz' })).toBeTruthy()
      expect(screen.getByText('#10')).toBeTruthy()
      expect(screen.getByText('#20 · línea de cotización #30')).toBeTruthy()
      expect(screen.getByText('Revisión')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar a comprobante' }))
      fireEvent.change(await screen.findByLabelText('Comprobante'), { target: { value: '44' } })
      expect((await screen.findByRole('alert')).textContent).toContain('No se pudo completar la operación.')
      fireEvent.change(screen.getByLabelText('Comprobante'), { target: { value: '' } })
      expect(screen.queryByRole('option', { name: /EXT-44/ })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(await screen.findByRole('heading', { name: 'SRV-50 · Ana Ruiz' })).toBeTruthy()
    } finally { window.history.replaceState({}, '', previous) }
  })
})
