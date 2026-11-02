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
  it('registra hitos de calidad y bloquea el cierre mientras haya una correctiva abierta', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    let current = { ...detail }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/casos/31/responder') && init?.method === 'POST') {
        current = { ...current, version: 8, estado: 'EN_ATENCION', respondidaEn: '2025-10-20T15:24:00.000Z' }
        return current as never
      }
      if (typeof url === 'string' && url.endsWith('/casos/31/resolver') && init?.method === 'POST') {
        current = { ...current, version: 9, estado: 'RESUELTO', resueltaEn: '2025-10-20T15:25:00.000Z', resultado: 'PROCEDE', causaRaiz: 'Sello desgastado' }
        return current as never
      }
      if (typeof url === 'string' && url.endsWith('/casos/31/retrabajos') && init?.method === 'POST') {
        current = { ...current, retrabajos: [{ id: 4, referenciaTrabajo: 'OT-30', fechaEfectiva: '2025-10-20T15:26:00.000Z', motivo: 'Corregir fuga', ordenId: null }] }
        return { id: 4 } as never
      }
      if (typeof url === 'string' && url.endsWith('/casos/31/correctivas') && init?.method === 'POST') {
        current = { ...current, correctivas: [{ id: 5, descripcion: 'Cambiar sello', responsableId: 5, responsableNombre: 'Luz Paz', creadaEn: '2025-10-20T15:27:00.000Z', venceEn: '2025-10-21T16:00:00.000Z', cerradaEn: null, resultado: null, version: 1 }] }
        return { id: 5 } as never
      }
      if (typeof url === 'string' && url.endsWith('/casos/31')) return current as never
      return page as never
    })
    render(<CasosCalidadPage />)
    await screen.findByText('Fuga en sello')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar respuesta' }))
    fireEvent.change(screen.getByLabelText('Fecha de respuesta'), { target: { value: '2025-10-20T10:24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('Los datos del caso se actualizaron.')
    fireEvent.click(screen.getByRole('button', { name: 'Resolver caso' }))
    fireEvent.change(screen.getByLabelText('Fecha de resolución'), { target: { value: '2025-10-20T10:25' } })
    fireEvent.change(screen.getByLabelText('Causa raíz'), { target: { value: 'Sello desgastado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('Los datos del caso se actualizaron.')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar retrabajo' }))
    fireEvent.change(screen.getByLabelText('Referencia del trabajo'), { target: { value: 'ot-30' } })
    fireEvent.change(screen.getByLabelText('Fecha efectiva'), { target: { value: '2025-10-20T10:26' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Corregir fuga' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('OT-30')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar acción correctiva' }))
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Cambiar sello' } })
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Creada'), { target: { value: '2025-10-20T10:27' } })
    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '2025-10-21T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('Cambiar sello')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar caso' }))
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2025-10-22T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Cierra todas las acciones correctivas antes de cerrar el caso.')).toBeTruthy()
    expect(apiMock).not.toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos/31/cerrar', expect.anything())
  })
  it('solo permite cerrar después del último hito y conserva la versión del caso', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    const resolved = {
      ...detail,
      estado: 'RESUELTO' as const,
      respondidaEn: '2025-10-20T15:24:00.000Z',
      resueltaEn: '2025-10-21T15:00:00.000Z',
      retrabajos: [{ id: 4, referenciaTrabajo: 'OT-30', fechaEfectiva: '2025-10-22T15:00:00.000Z', motivo: 'Verificar sello', ordenId: null }],
      correctivas: [{ ...correctiva, cerradaEn: '2025-10-23T15:00:00.000Z', resultado: 'Verificada' }],
    }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/casos/31/cerrar') && init?.method === 'POST') return { ...resolved, estado: 'CERRADO', cerradaEn: '2025-10-24T16:00:00.000Z', version: 8 } as never
      if (typeof url === 'string' && url.endsWith('/casos/31')) return resolved as never
      return page as never
    })
    render(<CasosCalidadPage />)
    await screen.findByText('Fuga en sello')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar caso' }))
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2025-10-22T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('El cierre debe ser posterior a la resolución y a todos los hitos, y no puede ser futuro.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fecha de cierre'), { target: { value: '2025-10-24T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos/31/cerrar', expect.objectContaining({ method: 'POST' })))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos/31/cerrar' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ version: 7, cerradaEn: '2025-10-24T10:00:00-06:00' })
    expect(await screen.findByText('CERRADO')).toBeTruthy()
  })
  it('valida que una resolución ocurra después de la respuesta y no en el futuro', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    const inAttention = { ...detail, estado: 'EN_ATENCION' as const, respondidaEn: '2025-10-20T15:24:00.000Z', version: 8 }
    const resolved = { ...inAttention, estado: 'RESUELTO' as const, resueltaEn: '2025-10-20T16:00:00.000Z', resultado: 'PROCEDE', causaRaiz: 'Sello desgastado', version: 9 }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/casos/31/resolver') && init?.method === 'POST') return resolved as never
      if (typeof url === 'string' && url.endsWith('/casos/31')) return inAttention as never
      return page as never
    })
    render(<CasosCalidadPage />)
    await screen.findByText('Fuga en sello')
    fireEvent.click(screen.getByRole('button', { name: 'Resolver caso' }))
    fireEvent.change(screen.getByLabelText('Fecha de resolución'), { target: { value: '2025-10-20T09:00' } })
    fireEvent.change(screen.getByLabelText('Causa raíz'), { target: { value: 'Sello desgastado' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByText('La resolución debe ocurrir desde la respuesta y hasta ahora.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fecha de resolución'), { target: { value: '2099-10-20T10:00' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByText('La resolución debe ocurrir desde la respuesta y hasta ahora.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fecha de resolución'), { target: { value: '2025-10-20T10:00' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos/31/resolver', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByText('RESUELTO')).toBeTruthy()
  })
  it('valida las fechas de creación y vencimiento y el responsable de una acción correctiva', async () => {
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.endsWith('/casos/31/correctivas') && init?.method === 'POST') return { id: 15 } as never
      if (typeof url === 'string' && url.endsWith('/casos/31')) return detail as never
      return page as never
    })
    render(<CasosCalidadPage />)
    await screen.findByText('Fuga en sello')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar acción correctiva' }))
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Cambiar sello' } })
    fireEvent.change(screen.getByLabelText('Creada'), { target: { value: '2025-10-19T10:00' } })
    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '2025-10-20T10:00' } })
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: '5' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByText('Revisa la creación, fecha límite y responsable de la acción correctiva.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Creada'), { target: { value: '2025-10-20T10:00' } })
    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '2025-10-19T10:00' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByText('Revisa la creación, fecha límite y responsable de la acción correctiva.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Fecha límite'), { target: { value: '2025-10-21T10:00' } })
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: '0' } })
    fireEvent.submit(document.querySelector('form')!)
    expect(await screen.findByText('Revisa la creación, fecha límite y responsable de la acción correctiva.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Responsable'), { target: { value: '5' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos/31/correctivas', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByText('Los datos del caso se actualizaron.')).toBeTruthy()
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
