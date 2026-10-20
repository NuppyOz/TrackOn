import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { GarantiasGerencialesPage } from '../src/features/fuentes-gerenciales/calidad/garantias'
import { CasosCalidadPage } from '../src/features/fuentes-gerenciales/calidad/casos'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))
vi.mock('../src/features/equipos/equipos.api', () => ({ listarEquipos: vi.fn().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false }) }))
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: vi.fn().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false }) }))
const apiMock = vi.mocked(api)
const emptyPage = { items: [], pagina: 1, limite: 25, hayMas: false }
const garantia = { id: 18, referencia: 'GAR-18', clienteId: 4, clienteNombre: 'Ana Ruiz', tipo: 'SERVICIO' as const, activoReferencia: 'BOMBA-01', equipoId: null, ordenId: null, inicio: '2026-10-01T06:00:00.000Z', fin: '2027-10-01T06:00:00.000Z', cobertura: 'Mano de obra', exclusiones: null, registradaEn: '2026-10-20T12:00:00.000Z', estado: 'VIGENTE' as const }
const caso = { id: 31, referencia: 'CAS-31', clienteId: 4, clienteNombre: 'Ana Ruiz', activoReferencia: 'BOMBA-01', codigoFalla: 'FUGA', descripcion: 'Fuga en sello', equipoId: null, ordenId: null, garantiaId: null, garantiaReferencia: null, anteriorId: null, abiertaEn: '2026-10-20T15:23:00.000Z', respuestaLimiteEn: null, resolucionLimiteEn: null, respondidaEn: null, resueltaEn: null, cerradaEn: null, resultado: null, causaRaiz: null, registradaEn: '2026-10-20T15:23:10.000Z', version: 1, estado: 'ABIERTO' as const, retrabajos: [], correctivas: [] }

describe('H8 B1 pages', () => {
  beforeEach(() => { apiMock.mockReset(); window.history.replaceState(null, '', '/') })
  afterEach(cleanup)
  it('muestra snapshot legible de garantía con estado y fechas', async () => {
    apiMock.mockImplementation(async (url) => typeof url === 'string' && url.endsWith('/garantias/18') ? garantia as never : { ...emptyPage, items: [garantia] } as never)
    render(<GarantiasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'GAR-18' }))
    expect(await screen.findByText('Mano de obra')).toBeTruthy()
    expect(screen.getByText('BOMBA-01')).toBeTruthy()
    expect(screen.getByText('Vigente')).toBeTruthy()
  })
  it('conserva el formulario de caso frente a 409 y envía apertura Managua con segundos y offset', async () => {
    let rejectPost: ((reason: unknown) => void) | undefined
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?')) return emptyPage as never
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST') return new Promise((_, reject) => { rejectPost = reject })
      return emptyPage as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CAS-409' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Referencia del activo/ }), { target: { value: 'bomba-01' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'fuga' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Fuga en sello' } })
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2025-10-20T10:23' } })
    const save = screen.getByRole('button', { name: 'Guardar caso' })
    fireEvent.click(save); fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')).toHaveLength(1))
    expect(save.hasAttribute('disabled')).toBe(true)
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')
    const body = JSON.parse(String(post?.[1]?.body)) as { abiertaEn: string }
    expect(body.abiertaEn).toBe('2025-10-20T10:23:00-06:00')
    rejectPost?.(new ApiError('Conflicto de versión', 409))
    expect(await screen.findByText(/formulario se conserva/)).toBeTruthy()
    expect((screen.getByLabelText('Referencia') as HTMLInputElement).value).toBe('CAS-409')
  })
  it('abre un caso por deep link int32 y presenta el snapshot', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    apiMock.mockImplementation(async (url) => typeof url === 'string' && url.endsWith('/casos/31') ? caso as never : emptyPage as never)
    render(<CasosCalidadPage />)
    expect(await screen.findByText('Fuga en sello')).toBeTruthy()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
  })
})
