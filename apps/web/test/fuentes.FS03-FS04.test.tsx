import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { CobrosPage } from '../src/features/fuentes-gerenciales/finanzas/cobros/CobrosPage'
import { CostosPage } from '../src/features/fuentes-gerenciales/finanzas/costos/CostosPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))

const apiMock = vi.mocked(api)
const page = { items: [], pagina: 1, limite: 25, hayMas: false }
const costo = { id: 51, referencia: 'CST-51', fechaEfectiva: '2026-10-01T16:00:00.000Z', categoria: 'MATERIAL', importe: '30.00', clienteId: null, clienteNombre: null, ordenId: null, comprobanteId: null, comprobanteReferencia: null, revertidoEn: null, motivoReversion: null, registradoEn: '2026-10-01T16:00:00.000Z', observacion: null, version: 4 }

describe('FS03–FS04 cobros y costos', () => {
  beforeEach(() => apiMock.mockReset())
  afterEach(() => { cleanup(); window.history.replaceState({}, '', '/') })

  it('abre primero la lista de cobros y el formulario al solicitar registrar', async () => {
    apiMock.mockResolvedValue(page)
    render(<CobrosPage />)
    expect(await screen.findByText('No hay cobros registrados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }))
    expect(screen.getByRole('heading', { name: 'Registrar cobro aplicado' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('envía las aplicaciones del cobro y no inventa un total recibido', async () => {
    const invoice = { id: 12, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'FAC-12', emisor: 'TALLER', emitidaEn: '2026-09-01T12:00:00.000Z', venceEn: '2026-11-01T12:00:00.000Z', importeFinal: '100.00', moneda: 'NIO', anuladaEn: null, motivoAnulacion: null, registradoEn: '2026-09-01T12:00:00.000Z', observacion: null, version: 1, saldo: '60.00' }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/comprobantes?')) return { items: [invoice], pagina: 1, limite: 25, hayMas: false } as never
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/finanzas/cobros' && init?.method === 'POST') return { id: 20 } as never
      return page as never
    })
    render(<CobrosPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar cobro' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' cob-20 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(await screen.findByLabelText('Comprobante'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Importe aplicado'), { target: { value: '60.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/cobros' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/cobros' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ clienteId: 4, referencia: 'COB-20', aplicaciones: [{ comprobanteId: 12, importe: '60.00' }] })
    expect(body).not.toHaveProperty('importe')
  })

  it('permite registrar un costo sin vínculos como sin asignar', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST') return { ...costo, id: 52, referencia: 'CST-52' } as never
      return page as never
    })
    render(<CostosPage />)
    expect(await screen.findByText('No hay costos registrados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar costo' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' cst-52 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2099-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'MATERIAL' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '0.00' } })
    const save = screen.getByRole('button', { name: 'Registrar costo' })
    expect(save.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    expect(save.hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '30.00' } })
    expect(save.hasAttribute('disabled')).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ referencia: 'CST-52', categoria: 'MATERIAL', importe: '30.00' })
    expect(body).not.toHaveProperty('clienteId')
    expect(body).not.toHaveProperty('ordenId')
    expect(body).not.toHaveProperty('comprobanteId')
  })

  it('recupera una lista fallida y rechaza importes de costo con formato o precisión inválidos', async () => {
    let listFailure = true
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/costos?') && listFailure) {
        listFailure = false
        throw new Error('Costos no disponibles')
      }
      if (url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST') throw 'fallo no tipado'
      return page as never
    })
    render(<CostosPage />)
    expect((await screen.findAllByText('Costos no disponibles')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay costos registrados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar costo' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CST-FORMATO' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'OTRO' } })
    const save = screen.getByRole('button', { name: 'Registrar costo' })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '01.00' } })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '30.001' } })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '30.00' } })
    expect((save as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(save)
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo completar la operación.')
  })

  it('carga páginas de órdenes y comprobantes, filtra anulados y crea el costo con los vínculos elegidos', async () => {
    const orden = { id: 13, numero: 'OT-13', clienteNombreRegistrado: 'Ana Ruiz' }
    const comprobante = { id: 44, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'FAC-44', emisor: 'TALLER', emitidaEn: '2026-09-01T12:00:00.000Z', venceEn: null, importeFinal: '80.00', moneda: 'NIO', anuladaEn: null, motivoAnulacion: null, registradoEn: '2026-09-01T12:00:00.000Z', observacion: null, version: 2 }
    const anulado = { ...comprobante, id: 45, referencia: 'FAC-45', anuladaEn: '2026-10-01T12:00:00.000Z' }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/ordenes?')) {
        const params = new URL(url, window.location.origin).searchParams
        return { items: params.get('pagina') === '1' ? [orden] : [orden, { ...orden, id: 14, numero: 'OT-14' }], pagina: Number(params.get('pagina')), limite: 25, hayMas: params.get('pagina') === '1' } as never
      }
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/finanzas/comprobantes?')) {
        const params = new URL(url, window.location.origin).searchParams
        return { items: params.get('pagina') === '1' ? [comprobante, anulado] : [comprobante], pagina: Number(params.get('pagina')), limite: 25, hayMas: params.get('pagina') === '1' } as never
      }
      if (url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST') return costo as never
      return page as never
    })
    render(<CostosPage />)
    await screen.findByText('No hay costos registrados')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar costo' }))
    await waitFor(() => expect(screen.getByRole('option', { name: /OT-13/ })).toBeTruthy())
    expect(screen.getByRole('option', { name: /FAC-44/ })).toBeTruthy()
    expect(screen.queryByRole('option', { name: /FAC-45/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más órdenes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más comprobantes' }))
    await waitFor(() => expect(screen.getByRole('option', { name: /OT-14/ })).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CST-54' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'TRANSPORTE' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '18.50' } })
    fireEvent.change(screen.getByLabelText('Cliente (opcional)'), { target: { value: '4' } })
    await waitFor(() => expect(apiMock.mock.calls.some(([url]) => typeof url === 'string' && url.startsWith('/api/ordenes?') && url.includes('clienteId=4'))).toBe(true))
    fireEvent.change(screen.getByLabelText('Orden de trabajo (opcional)'), { target: { value: '13' } })
    fireEvent.change(screen.getByLabelText('Comprobante (opcional)'), { target: { value: '44' } })
    fireEvent.change(screen.getByLabelText('Observación (opcional)'), { target: { value: '  traslado  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar costo' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ referencia: 'CST-54', categoria: 'TRANSPORTE', importe: '18.50', clienteId: 4, ordenId: 13, comprobanteId: 44, observacion: 'traslado' })
  })

  it('conserva el detalle y la versión congelada ante un conflicto al revertir costo', async () => {
    window.history.replaceState({}, '', '/?costoId=51')
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/costos/51' && !init?.method) return costo as never
      if (url === '/api/fuentes-gerenciales/finanzas/costos/51/revertir') throw new ApiError('El costo cambió desde que se abrió.', 409)
      return page as never
    })
    render(<CostosPage />)
    expect(await screen.findByRole('heading', { name: 'CST-51' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Revertir costo' }))
    fireEvent.change(screen.getByLabelText('Fecha de reversión'), { target: { value: '2026-10-02T10:00' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Registro duplicado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reversión' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('El costo cambió'))
    const call = apiMock.mock.calls.find(([url]) => url === '/api/fuentes-gerenciales/finanzas/costos/51/revertir')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ version: 4, motivo: 'Registro duplicado' })
    expect((screen.getByLabelText('Motivo') as HTMLTextAreaElement).value).toBe('Registro duplicado')
  })

  it('muestra un costo revertido con sus tres vínculos y oculta la acción de reversión', async () => {
    const assigned = { ...costo, id: 53, referencia: 'CST-53', clienteId: 4, clienteNombre: 'Ana Ruiz', ordenId: 13, comprobanteId: 44, comprobanteReferencia: 'EXT-44', observacion: null, revertidoEn: '2026-10-02T16:00:00.000Z', motivoReversion: 'Duplicado' }
    apiMock.mockImplementation(async url => url === '/api/fuentes-gerenciales/finanzas/costos/53' ? assigned as never : page as never)
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?costoId=53')
    render(<CostosPage />)
    expect(await screen.findByRole('heading', { name: 'CST-53' })).toBeTruthy()
    expect(screen.getByText('Ana Ruiz · #4')).toBeTruthy()
    expect(screen.getByText('#13')).toBeTruthy()
    expect(screen.getByText('EXT-44 · #44')).toBeTruthy()
    expect(screen.getByText('Asignado')).toBeTruthy()
    expect(screen.getByText(/Duplicado/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Revertir costo' })).toBeNull()
  })

  it('revierte un cobro desde el detalle y conserva fecha, motivo y aplicaciones históricas', async () => {
    const cobro = { id: 20, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'COB-20', fechaEfectiva: '2026-10-01T16:00:00.000Z', importe: '60.00', registradoEn: '2026-10-01T16:00:00.000Z', observacion: 'Pago transferencia', revertidoEn: null, motivoReversion: null, version: 2, aplicaciones: [{ id: 30, comprobanteId: 12, comprobanteReferencia: 'FAC-12', importe: '60.00' }] }
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/finanzas/cobros/20/revertir' && init?.method === 'POST') return { ...cobro, revertidoEn: '2026-11-01T16:00:00.000Z', motivoReversion: 'Pago duplicado' } as never
      if (url === '/api/fuentes-gerenciales/finanzas/cobros/20') return cobro as never
      return page as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/finanzas?cobroId=20')
    try {
      render(<CobrosPage />)
      expect(await screen.findByRole('heading', { name: 'COB-20 · Ana Ruiz' })).toBeTruthy()
      expect(screen.getByText('FAC-12 · #12')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Revertir cobro' }))
      const confirm = screen.getByRole('button', { name: 'Confirmar reversión' })
      expect(confirm.hasAttribute('disabled')).toBe(true)
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Pago duplicado' } })
      expect(confirm.hasAttribute('disabled')).toBe(false)
      fireEvent.click(confirm)
      await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/cobros/20/revertir' && init?.method === 'POST')).toBe(true))
      const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/cobros/20/revertir' && init?.method === 'POST')
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ version: 2, motivo: 'Pago duplicado' })
      expect(await screen.findByText(/Pago duplicado/)).toBeTruthy()
      expect(screen.getAllByText('Revertido').length).toBeGreaterThan(0)
      expect(screen.queryByRole('button', { name: 'Revertir cobro' })).toBeNull()
    } finally { window.history.replaceState({}, '', previous) }
  })
})
