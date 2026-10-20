import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { ComprasGerencialesPage } from '../src/features/fuentes-gerenciales/logistica/compras/ComprasGerencialesPage'
import { HerramientasGerencialesPage } from '../src/features/fuentes-gerenciales/logistica/herramientas/HerramientasGerencialesPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
const apiMock = vi.mocked(api)
const emptyPage = { items: [], pagina: 1, limite: 25, hayMas: false }
const article = { id: 7, codigo: 'ART-7', nombre: 'Filtro', unidad: 'unidad', minimo: '0.000', saldoCantidad: '0.000', saldoValor: '0.000000000', costoPromedio: null, ultimaFecha: '', version: 1, materialId: null, creadoEn: '2026-10-01T12:00:00.000Z' }
const tool = { id: 9, codigo: 'HER-9', nombre: 'Manómetro', creadaEn: '2026-10-01T12:00:00.000Z', estado: 'DISPONIBLE' as const }

describe('H7 bloque 2 compras y herramientas', () => {
  beforeEach(() => { apiMock.mockReset(); vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'h7-b2-key') }) })
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('retiene líneas y clave al reintentar el compromiso de compra tras conflicto', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/logistica/compras?')) return emptyPage as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/logistica/articulos?')) return { items: [article], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/logistica/compras' && init?.method === 'POST') throw new ApiError('La referencia ya existe.', 409)
      return emptyPage as never
    })
    render(<ComprasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar compra' }))
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: '  proveedor uno ' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' cmp-22 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(await screen.findByLabelText('Artículo'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar línea' }))
    fireEvent.change(screen.getByLabelText('Cantidad (unidad)'), { target: { value: '2.125' } })
    fireEvent.change(screen.getByLabelText('Costo unitario (hasta 6 decimales, NIO)'), { target: { value: '13.123456' } })
    fireEvent.change(screen.getByLabelText('Fecha prometida'), { target: { value: '2026-10-02T10:00' } })
    const submit = screen.getByRole('button', { name: 'Registrar compra' })
    fireEvent.click(submit)
    await waitFor(() => expect(screen.getByText('La referencia ya existe.')).toBeTruthy())
    fireEvent.click(submit)
    await waitFor(() => expect(apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/compras' && init?.method === 'POST')).toHaveLength(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/compras' && init?.method === 'POST')
    expect((posts[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe((posts[0]?.[1]?.headers as Record<string, string>)['Idempotency-Key'])
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toMatchObject({ proveedor: 'PROVEEDOR UNO', referencia: 'CMP-22', lineas: [{ articuloId: 7, cantidad: '2.125', costoUnitario: '13.123456' }] })
    expect((screen.getByLabelText('Cantidad (unidad)') as HTMLInputElement).value).toBe('2.125')
  })

  it('conserva la recepción y su clave al reintentar un conflicto', async () => {
    const summary = { id: 6, proveedor: 'PROVEEDOR', referencia: 'CMP-6', fechaEfectiva: '2026-10-01T16:00:00.000Z', registradoEn: '2026-10-01T16:05:00.000Z', observacion: null }
    const line = { id: 30, articuloId: 7, articuloCodigo: 'ART-7', articuloNombre: 'Filtro', unidad: 'unidad', cantidad: '2.000', costoUnitario: '9.123456', prometidaEn: '2026-10-25T16:00:00.000Z', recibido: '0.000', cancelado: '0.000', pendiente: '2.000', canceladaEn: null, motivoCancelacion: null, version: 2 }
    const purchase = { ...summary, lineas: [line], recepciones: [] }
    const updated = { ...summary, lineas: [{ ...line, recibido: '1.000', pendiente: '1.000', version: 3 }], recepciones: [{ id: 50, lineaId: 30, articuloId: 7, articuloCodigo: 'ART-7', unidad: 'unidad', cantidad: '1.000', fechaEfectiva: '2026-10-20T16:00:00.000Z', referencia: 'REC-6', movimientoId: 70, observacion: null }] }
    let receiveTries = 0
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/logistica/compras?pagina=1&limite=25') return { items: [summary], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/logistica/compras/6') return purchase as never
      if (url === '/api/fuentes-gerenciales/logistica/compras/lineas/30/recibir' && init?.method === 'POST') { receiveTries += 1; if (receiveTries === 1) throw new ApiError('La compra cambió; revisa la versión.', 409); return updated as never }
      return emptyPage as never
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ComprasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'CMP-6' }))
    fireEvent.click(await screen.findByLabelText('Acciones para ART-7'))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar recepción' }))
    fireEvent.change(screen.getByLabelText('Referencia de recepción'), { target: { value: 'rec-6' } })
    fireEvent.change(screen.getByLabelText('Cantidad a recibir'), { target: { value: '1.000' } })
    const submit = screen.getByRole('button', { name: 'Confirmar recepción' })
    fireEvent.click(submit)
    await waitFor(() => expect(screen.getByText('La compra cambió; revisa la versión.')).toBeTruthy())
    fireEvent.click(submit)
    await waitFor(() => expect(receiveTries).toBe(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/compras/lineas/30/recibir' && init?.method === 'POST')
    expect((posts[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe((posts[0]?.[1]?.headers as Record<string, string>)['Idempotency-Key'])
    expect(JSON.parse(String(posts[1]?.[1]?.body))).toMatchObject({ version: 2, referencia: 'REC-6', cantidad: '1.000' })
    expect(await screen.findByText('Recepción registrada y saldo actualizado.')).toBeTruthy()
  })

  it('presta una herramienta al empleado activo elegido desde el catálogo real', async () => {
    const employee = { id: 14, codEmpleado: 'EMP-14', active: true, habilitadoComoTecnico: false, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null } }
    const loan = { id: 32, herramientaId: 9, empleadoId: 14, empleadoNombre: 'Ana Ruiz', prestadaEn: '2026-10-20T16:00:00.000Z', previstaEn: '2026-10-21T16:00:00.000Z', devueltaEn: null, referencia: 'PRE-9', observacion: null }
    const borrowed = { ...tool, estado: 'PRESTADA' as const, prestamos: [loan] }
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/logistica/herramientas?pagina=1&limite=25') return { items: [tool], pagina: 1, limite: 25, hayMas: false } as never
      if (url === '/api/fuentes-gerenciales/logistica/herramientas/9' && init?.method !== 'POST') return { ...tool, prestamos: [] } as never
      if (url === '/api/empleados') return [employee] as never
      if (url === '/api/fuentes-gerenciales/logistica/herramientas/9/prestar' && init?.method === 'POST') return borrowed as never
      return { items: [borrowed], pagina: 1, limite: 25, hayMas: false } as never
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<HerramientasGerencialesPage />)
    fireEvent.click(await screen.findByLabelText('Acciones de herramienta HER-9'))
    fireEvent.click(screen.getByRole('button', { name: 'Prestar herramienta' }))
    fireEvent.change(await screen.findByLabelText('Empleado'), { target: { value: '14' } })
    await screen.findByRole('option', { name: /Ana Ruiz · EMP-14/ })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'pre-9' } })
    fireEvent.change(screen.getByLabelText('Fecha de préstamo'), { target: { value: '2026-10-20T09:00:00' } })
    fireEvent.change(screen.getByLabelText('Devolución prevista'), { target: { value: '2026-10-21T09:00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar préstamo' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/logistica/herramientas/9/prestar' && init?.method === 'POST')).toBe(true))
    const call = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/logistica/herramientas/9/prestar' && init?.method === 'POST')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ empleadoId: 14, referencia: 'PRE-9' })
    expect(call?.[1]?.headers).toMatchObject({ 'Idempotency-Key': 'h7-b2-key' })
    expect(await screen.findByText('Préstamo registrado; la herramienta está prestada.')).toBeTruthy()
  })
})
