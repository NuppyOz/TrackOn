import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { CasosCalidadPage } from '../src/features/fuentes-gerenciales/calidad/casos'
import { CorrectivasGerencialesPage } from '../src/features/fuentes-gerenciales/calidad/correctivas'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/features/equipos/equipos.api', () => ({ listarEquipos: vi.fn().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false }) }))
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: vi.fn().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false }) }))
vi.mock('../src/features/empleados/empleados.api', () => ({ listarEmpleados: vi.fn().mockResolvedValue([{ id: 5, codEmpleado: 'EMP-5', active: true, habilitadoComoTecnico: false, persona: { firstName: 'Luz', secondName: null, firstLastName: 'Paz', secondLastName: null } }]) }))
const apiMock = vi.mocked(api)
const page = { items: [], pagina: 1, limite: 25, hayMas: false }
const detail = { id: 31, referencia: 'CAS-31', clienteId: 4, clienteNombre: 'Ana Ruiz', activoReferencia: 'BOMBA-01', codigoFalla: 'FUGA', descripcion: 'Fuga en sello', equipoId: 12, ordenId: 18, garantiaId: null, garantiaReferencia: null, anteriorId: null, abiertaEn: '2025-10-20T15:23:00.000Z', respuestaLimiteEn: null, resolucionLimiteEn: null, respondidaEn: null, resueltaEn: null, cerradaEn: null, resultado: null, causaRaiz: null, registradaEn: '2025-10-20T15:23:10.000Z', version: 7, estado: 'ABIERTO' as const, retrabajos: [], correctivas: [] }
const correctiva = { id: 9, casoId: 31, casoReferencia: 'CAS-31', descripcion: 'Cambiar sello', responsableId: 5, responsableNombre: 'Luz Paz', creadaEn: '2025-10-20T15:23:00.000Z', venceEn: '2026-10-30T15:23:00.000Z', cerradaEn: null, resultado: null, version: 3 }

describe('H8 B2 pages', () => {
  beforeEach(() => { apiMock.mockReset(); window.history.replaceState(null, '', '/') })
  afterEach(cleanup)
  it('congela la versión y conserva la respuesta tras 409; el retry repite payload e idempotency key', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    let rejects: ((reason: unknown) => void) | undefined; let postCount = 0
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?')) return page as never
      if (typeof url === 'string' && url.endsWith('/casos/31/responder') && init?.method === 'POST') { postCount++; if (postCount === 1) return new Promise((_, reject) => { rejects = reject }); return { ...detail, version: 8, estado: 'EN_ATENCION', respondidaEn: '2025-10-20T15:23:00.000Z' } as never }
      if (typeof url === 'string' && url.endsWith('/casos/31')) return detail as never
      return page as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar respuesta' }))
    fireEvent.change(screen.getByLabelText('Fecha de respuesta'), { target: { value: '2025-10-20T10:24' } })
    const save = screen.getByRole('button', { name: 'Guardar' })
    fireEvent.click(save)
    await waitFor(() => expect(postCount).toBe(1))
    expect(save.hasAttribute('disabled')).toBe(true)
    rejects?.(new ApiError('Conflicto de versión', 409))
    expect(await screen.findByText(/Cancela el formulario, vuelve al listado/)).toBeTruthy()
    expect((screen.getByLabelText('Fecha de respuesta') as HTMLInputElement).value).toBe('2025-10-20T10:24')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(postCount).toBe(2))
    const posts = apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos/31/responder' && init?.method === 'POST')
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({ version: 7, respondidaEn: '2025-10-20T10:24:00-06:00' })
    expect(posts[1]?.[1]?.headers).toEqual(posts[0]?.[1]?.headers)
    expect(await screen.findByText('EN ATENCION')).toBeTruthy()
  })
  it('cierra una acción correctiva usando su versión y mantiene enlace al caso', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?correctivaId=9')
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/correctivas/9') && init?.method !== 'POST') return correctiva as never
      if (typeof url === 'string' && url.endsWith('/correctivas/9/cerrar') && init?.method === 'POST') return { ...correctiva, cerradaEn: '2026-10-20T16:30:00.000Z', resultado: 'Sellado verificado', version: 4 } as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/correctivas?')) return page as never
      return page as never
    })
    render(<CorrectivasGerencialesPage />)
    expect(await screen.findByText('Cambiar sello')).toBeTruthy()
    expect((screen.getByRole('link', { name: /CAS-31/ }) as HTMLAnchorElement).getAttribute('href')).toBe('/inteligencia/origen/calidad?casoId=31')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar acción' }))
    fireEvent.change(screen.getByLabelText('Resultado del cierre'), { target: { value: 'Sellado verificado' } })
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2026-10-20T10:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cierre' }))
    expect(await screen.findByText('La acción correctiva quedó cerrada.')).toBeTruthy()
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/correctivas/9/cerrar' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ version: 3, cerradaEn: '2026-10-20T10:30:00-06:00', resultado: 'Sellado verificado' })
    expect(screen.getAllByText('Cerrada').length).toBeGreaterThan(0)
  })
})
