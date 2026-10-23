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
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'MATERIAL' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '30.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar costo' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/finanzas/costos' && init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ referencia: 'CST-52', categoria: 'MATERIAL', importe: '30.00' })
    expect(body).not.toHaveProperty('clienteId')
    expect(body).not.toHaveProperty('ordenId')
    expect(body).not.toHaveProperty('comprobanteId')
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
})
