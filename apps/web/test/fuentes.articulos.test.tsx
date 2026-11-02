import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/shared/api'
import { ArticulosPage } from '../src/features/fuentes-gerenciales/logistica/articulos/ArticulosPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})

const apiMock = vi.mocked(api)
const page = { items: [], pagina: 1, limite: 25, hayMas: false }
const articulo = { id: 7, codigo: 'ART-7', nombre: 'Grasa', unidad: 'kg', minimo: '2.000', saldoCantidad: '3.000', saldoValor: '30.00', costoPromedio: '10.000000', ultimaFecha: '2026-10-01T16:00:00.000Z', version: 1, materialId: null, creadoEn: '2026-10-01T16:00:00.000Z' }

describe('ArticulosPage', () => {
  beforeEach(() => { apiMock.mockReset(); window.history.replaceState({}, '', '/') })
  afterEach(cleanup)

  it('valida el saldo inicial y crea el artículo normalizado', async () => {
    let attempts = 0
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/materiales?')) return page as never
      if (url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST') {
        attempts++
        if (attempts === 1) throw new Error('Código duplicado')
        return articulo as never
      }
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/logistica/articulos?')) return page as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/logistica/movimientos?')) return page as never
      return page as never
    })
    render(<ArticulosPage />)
    expect(await screen.findByText('No hay artículos registrados')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo artículo' }))
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: ' art-7 ' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: ' Grasa ' } })
    fireEvent.change(screen.getByLabelText('Unidad'), { target: { value: 'kg' } })
    fireEvent.change(screen.getByLabelText('Mínimo (unidades)'), { target: { value: '1.0000' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' Apertura-7 ' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00:00' } })
    fireEvent.change(screen.getByLabelText('Cantidad inicial'), { target: { value: '3.000' } })
    fireEvent.change(screen.getByLabelText('Costo unitario (hasta 6 decimales)'), { target: { value: '10.1234567' } })
    fireEvent.change(screen.getByLabelText('Observación (obligatoria)'), { target: { value: 'Apertura inicial' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear artículo con apertura' }))
    expect(await screen.findByText('Revisa mínimo/cantidad (3 decimales) y costo unitario (6 decimales).')).toBeTruthy()
    expect(apiMock).not.toHaveBeenCalledWith('/api/fuentes-gerenciales/logistica/articulos', expect.objectContaining({ method: 'POST' }))

    fireEvent.change(screen.getByLabelText('Mínimo (unidades)'), { target: { value: '1.000' } })
    fireEvent.change(screen.getByLabelText('Costo unitario (hasta 6 decimales)'), { target: { value: '10.123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear artículo con apertura' }))
    expect(await screen.findByText('No se pudo guardar; revisa el error indicado y vuelve a intentarlo.')).toBeTruthy()
    expect(screen.getByText('Código duplicado')).toBeTruthy()
    const firstRequest = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST')
    fireEvent.click(screen.getByRole('button', { name: 'Crear artículo con apertura' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST')).toBe(true))
    await waitFor(() => expect(attempts).toBe(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST')
    const post = posts[1]
    expect((posts[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe((firstRequest?.[1]?.headers as Record<string, string>)['Idempotency-Key'])
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ codigo: 'ART-7', nombre: 'Grasa', unidad: 'kg', minimo: '1.000', apertura: { referencia: 'APERTURA-7', cantidad: '3.000', costoUnitario: '10.123456', observacion: 'Apertura inicial' } })
    expect(await screen.findByRole('heading', { name: 'ART-7 · Grasa' })).toBeTruthy()
    expect(screen.getByText('Costo promedio informativo')).toBeTruthy()
  })

  it('abre el artículo por deep link y carga el historial vacío', async () => {
    window.history.replaceState({}, '', '/inteligencia/origen/logistica?articuloId=7')
    apiMock.mockImplementation(async url => {
      if (url === '/api/fuentes-gerenciales/logistica/articulos/7') return { ...articulo, costoPromedio: null } as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/logistica/movimientos?')) return page as never
      return page as never
    })
    render(<ArticulosPage />)
    expect(await screen.findByRole('heading', { name: 'ART-7 · Grasa' })).toBeTruthy()
    expect(screen.getByText('Sin saldo')).toBeTruthy()
    expect(await screen.findByText('Sin movimientos registrados')).toBeTruthy()
  })

  it('valida por separado los datos del artículo, su referencia, fecha y precisión decimal', async () => {
    apiMock.mockImplementation(async url => typeof url === 'string' && url.startsWith('/api/materiales?') ? page as never : page as never)
    render(<ArticulosPage />)
    await screen.findByText('No hay artículos registrados')
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo artículo' }))
    const form = screen.getByRole('form', { name: 'Nuevo artículo' })
    fireEvent.submit(form)
    expect(await screen.findByText('Completa código (1–60), nombre (1–150) y unidad (1–30).')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'ART-9' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Filtro' } })
    fireEvent.change(screen.getByLabelText('Unidad'), { target: { value: 'unidad' } })
    fireEvent.submit(form)
    expect(await screen.findByText('Referencia obligatoria (hasta 100) y observación obligatoria (hasta 1000 caracteres).')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'Entrada-9' } })
    fireEvent.change(screen.getByLabelText('Observación (obligatoria)'), { target: { value: 'Stock inicial' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2099-10-01T10:00:00' } })
    fireEvent.submit(form)
    expect(await screen.findByText('La fecha de apertura debe ser válida y no futura.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2025-10-01T10:00:00' } })
    fireEvent.change(screen.getByLabelText('Cantidad inicial'), { target: { value: '1.0000' } })
    fireEvent.submit(form)
    expect(await screen.findByText('Revisa mínimo/cantidad (3 decimales) y costo unitario (6 decimales).')).toBeTruthy()
  })
})
