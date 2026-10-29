import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { ArticulosPage } from '../src/features/fuentes-gerenciales/logistica/articulos/ArticulosPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})

const apiMock = vi.mocked(api)
const page = { items: [], pagina: 1, limite: 25, hayMas: false }

describe('H7 bloque 1 artículos y movimientos', () => {
  beforeEach(() => {
    apiMock.mockReset()
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'h7-intent-key') })
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('conserva apertura y clave de intención al reintentar el alta tras conflicto', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST') throw new ApiError('El código ya está registrado.', 409)
      return page as never
    })
    render(<ArticulosPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo artículo' }))
    fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'art-10' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Compresor' } })
    fireEvent.change(screen.getByLabelText('Unidad'), { target: { value: 'unidad' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'ini-10' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Cantidad inicial'), { target: { value: '2.125' } })
    fireEvent.change(screen.getByLabelText('Costo unitario (hasta 6 decimales)'), { target: { value: '12.345678' } })
    fireEvent.change(screen.getByLabelText('Observación (obligatoria)'), { target: { value: 'Saldo inicial' } })
    const submit = screen.getByRole('button', { name: 'Crear artículo con apertura' })
    fireEvent.click(submit)
    await waitFor(() => expect(screen.getByText('El código ya está registrado.')).toBeTruthy())
    fireEvent.click(submit)
    await waitFor(() => expect(apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST')).toHaveLength(2))
    const calls = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/logistica/articulos' && init?.method === 'POST')
    expect((calls[1]?.[1]?.headers as Record<string, string>)['Idempotency-Key']).toBe((calls[0]?.[1]?.headers as Record<string, string>)['Idempotency-Key'])
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toMatchObject({ codigo: 'ART-10', apertura: { referencia: 'INI-10', cantidad: '2.125', costoUnitario: '12.345678', observacion: 'Saldo inicial' } })
    expect((screen.getByLabelText('Observación (obligatoria)') as HTMLTextAreaElement).value).toBe('Saldo inicial')
  })
})
