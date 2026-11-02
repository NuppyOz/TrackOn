import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { GarantiasGerencialesPage } from '../src/features/fuentes-gerenciales/calidad/garantias'
import { CasosCalidadPage } from '../src/features/fuentes-gerenciales/calidad/casos'

const relatedMocks = vi.hoisted(() => ({ listarEquipos: vi.fn(), listarOrdenes: vi.fn() }))
vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))
vi.mock('../src/features/equipos/equipos.api', () => ({ listarEquipos: relatedMocks.listarEquipos }))
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: relatedMocks.listarOrdenes }))
const apiMock = vi.mocked(api)
const emptyPage = { items: [], pagina: 1, limite: 25, hayMas: false }
const garantia = { id: 18, referencia: 'GAR-18', clienteId: 4, clienteNombre: 'Ana Ruiz', tipo: 'SERVICIO' as const, activoReferencia: 'BOMBA-01', equipoId: null, ordenId: null, inicio: '2026-10-01T06:00:00.000Z', fin: '2027-10-01T06:00:00.000Z', cobertura: 'Mano de obra', exclusiones: null, registradaEn: '2026-10-20T12:00:00.000Z', estado: 'VIGENTE' as const }
const caso = { id: 31, referencia: 'CAS-31', clienteId: 4, clienteNombre: 'Ana Ruiz', activoReferencia: 'BOMBA-01', codigoFalla: 'FUGA', descripcion: 'Fuga en sello', equipoId: null, ordenId: null, garantiaId: null, garantiaReferencia: null, anteriorId: null, abiertaEn: '2026-10-20T15:23:00.000Z', respuestaLimiteEn: null, resolucionLimiteEn: null, respondidaEn: null, resueltaEn: null, cerradaEn: null, resultado: null, causaRaiz: null, registradaEn: '2026-10-20T15:23:10.000Z', version: 1, estado: 'ABIERTO' as const, retrabajos: [], correctivas: [] }

describe('H8 B1 pages', () => {
  beforeEach(() => {
    apiMock.mockReset(); window.history.replaceState(null, '', '/')
    relatedMocks.listarEquipos.mockReset().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false })
    relatedMocks.listarOrdenes.mockReset().mockResolvedValue({ items: [], pagina: 1, limite: 25, hayMas: false })
  })
  afterEach(cleanup)
  it('muestra snapshot legible de garantía con estado y fechas', async () => {
    apiMock.mockImplementation(async (url) => typeof url === 'string' && url.endsWith('/garantias/18') ? garantia as never : { ...emptyPage, items: [garantia] } as never)
    render(<GarantiasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'GAR-18' }))
    expect(await screen.findByText('Mano de obra')).toBeTruthy()
    expect(screen.getByText('BOMBA-01')).toBeTruthy()
    expect(screen.getByText('Vigente')).toBeTruthy()
  })
  it('valida fechas y registra una garantía normalizada sin asociaciones opcionales', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST') return { ...garantia, referencia: 'GAR-NUEVA', activoReferencia: 'BOMBA-02', equipoId: null, ordenId: null, cobertura: 'Mano de obra extendida' } as never
      return emptyPage as never
    })
    render(<GarantiasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva garantía' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' gar-nueva ' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia del activo'), { target: { value: 'bomba-02' } })
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2027-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2027-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Cobertura'), { target: { value: 'Mano de obra' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar garantía' }))
    expect(await screen.findByText('La fecha final debe ser posterior a la inicial.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2028-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Cobertura'), { target: { value: ' Mano de obra extendida ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar garantía' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST')).toBe(true))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ referencia: 'GAR-NUEVA', clienteId: 4, activoReferencia: 'BOMBA-02', cobertura: 'Mano de obra extendida' })
    expect(JSON.parse(String(post?.[1]?.body))).not.toHaveProperty('equipoId')
    expect(await screen.findByText('GAR-NUEVA')).toBeTruthy()
    expect(screen.getByText('Sin exclusiones registradas')).toBeTruthy()
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
  it('presenta acciones disponibles según estado y bloquea acciones en casos cerrados', async () => {
    const states = [
      { ...caso, id: 41, referencia: 'CAS-ATENCION', estado: 'EN_ATENCION' as const, respondidaEn: '2026-10-20T16:00:00.000Z' },
      { ...caso, id: 42, referencia: 'CAS-RESUELTO', estado: 'RESUELTO' as const, respondidaEn: '2026-10-20T16:00:00.000Z', resueltaEn: '2026-10-20T17:00:00.000Z' },
      { ...caso, id: 43, referencia: 'CAS-CERRADO', estado: 'CERRADO' as const, respondidaEn: '2026-10-20T16:00:00.000Z', resueltaEn: '2026-10-20T17:00:00.000Z', cerradaEn: '2026-10-20T18:00:00.000Z' },
    ]
    apiMock.mockImplementation(async url => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?')) return { items: states, pagina: 1, limite: 25, hayMas: false } as never
      const id = Number(String(url).split('/').pop())
      return states.find(item => item.id === id) as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'CAS-ATENCION' }))
    expect(await screen.findByRole('button', { name: 'Resolver caso' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al listado' }))
    fireEvent.click(await screen.findByRole('button', { name: 'CAS-RESUELTO' }))
    expect(await screen.findByRole('button', { name: 'Cerrar caso' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Volver al listado' }))
    fireEvent.click(await screen.findByRole('button', { name: 'CAS-CERRADO' }))
    await screen.findByText('CAS-CERRADO')
    expect(screen.queryByRole('region', { name: 'Acciones del caso' })).toBeNull()
  })
  it('envía filtros de caso normalizados y conserva los valores opcionales', async () => {
    apiMock.mockResolvedValue(emptyPage)
    render(<CasosCalidadPage />)
    await screen.findByText('No hay casos para estos filtros')
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: ' CAS-31 ' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Activo'), { target: { value: ' bomba-01 ' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: ' fuga ' } })
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'EN_ATENCION' } })
    await waitFor(() => {
      const latest = String(apiMock.mock.calls.filter(([url]) => typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?')).at(-1)?.[0])
      expect(latest).toContain('q=CAS-31')
      expect(latest).toContain('clienteId=4')
      expect(latest).toContain('activoReferencia=bomba-01')
      expect(latest).toContain('codigoFalla=fuga')
      expect(latest).toContain('estado=EN_ATENCION')
    })
  })
  it('recupera la lista de casos después de un error transitorio', async () => {
    let failed = false
    apiMock.mockImplementation(async (url) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?') && !failed) {
        failed = true
        throw new Error('No se pudo consultar casos')
      }
      return emptyPage as never
    })
    render(<CasosCalidadPage />)
    expect(await screen.findByText('No se pudo consultar casos')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay casos para estos filtros')).toBeTruthy()
  })

  it('muestra los errores al cargar asociaciones dependientes y deja cancelar el alta', async () => {
    relatedMocks.listarEquipos.mockRejectedValue(new Error('Equipos no disponibles'))
    apiMock.mockResolvedValue(emptyPage)
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    expect(await screen.findByText(/Equipos no disponibles/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('No hay casos para estos filtros')).toBeTruthy()
  })
  it('muestra y recupera el error al cargar antecedentes del mismo activo y falla', async () => {
    apiMock.mockImplementation(async url => {
      if (typeof url === 'string' && url.includes('abiertaAntes=')) throw new Error('Antecedentes no disponibles')
      return emptyPage as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Referencia del activo/ }), { target: { value: 'BOMBA-01' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'FUGA' } })
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2025-10-20T10:00' } })
    expect((await screen.findByRole('alert')).textContent).toContain('Antecedentes no disponibles')
    expect((screen.getByRole('button', { name: 'Más' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('reintenta la carga de empleados antes de ofrecer un responsable para la acción correctiva', async () => {
    let employeeCalls = 0
    apiMock.mockImplementation(async url => {
      if (url === '/api/empleados' && employeeCalls++ === 0) throw new Error('Empleados no disponibles')
      if (url === '/api/empleados') return [] as never
      if (url === '/api/fuentes-gerenciales/calidad/casos/31') return caso as never
      return emptyPage as never
    })
    window.history.replaceState(null, '', '/inteligencia/origen/calidad?casoId=31')
    render(<CasosCalidadPage />)
    await screen.findByText('Fuga en sello')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar acción correctiva' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Empleados no disponibles')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(employeeCalls).toBe(2))
    expect(screen.getByLabelText('Responsable')).toBeTruthy()
  })
  it('carga páginas completas de equipos, órdenes, garantías y antecedentes para asociarlas al caso', async () => {
    const olderCase = { ...caso, id: 20, referencia: 'CAS-20', abiertaEn: '2025-10-19T12:00:00.000Z' }
    const newerCase = { ...caso, id: 21, referencia: 'CAS-21', abiertaEn: '2025-10-18T12:00:00.000Z' }
    const equipment = { id: 12, codigo: 'EQ-12', tipo: 'BOMBA', numeroSerie: null, activo: true }
    const order = { id: 18, numero: 'OT-18', estadoCodigo: 'ABIERTA', clienteNombreRegistrado: 'Ana Ruiz' }
    relatedMocks.listarEquipos.mockImplementation(async ({ pagina }: { pagina: number }) => ({ items: pagina === 1 ? [equipment] : [], pagina, limite: 25, hayMas: pagina === 1 }))
    relatedMocks.listarOrdenes.mockImplementation(async ({ pagina }: { pagina: number }) => ({ items: pagina === 1 ? [order] : [], pagina, limite: 25, hayMas: pagina === 1 }))
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/garantias?')) {
        const pageNumber = new URLSearchParams(url.split('?')[1]).get('pagina')
        return { items: pageNumber === '1' ? [garantia] : [], pagina: Number(pageNumber), limite: 25, hayMas: pageNumber === '1' } as never
      }
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/calidad/casos?') && url.includes('abiertaAntes=')) {
        const pageNumber = new URLSearchParams(url.split('?')[1]).get('pagina')
        return { items: [pageNumber === '2' ? newerCase : olderCase], pagina: Number(pageNumber), limite: 25, hayMas: pageNumber === '1' } as never
      }
      if (url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST') return { ...caso, referencia: 'CAS-ASOCIADO' } as never
      return emptyPage as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Referencia del activo/ }), { target: { value: 'BOMBA-01' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'FUGA' } })
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2025-10-20T10:00' } })
    await screen.findByRole('option', { name: /EQ-12/ })
    await screen.findByRole('option', { name: /OT-18/ })
    await screen.findByRole('option', { name: /GAR-18/ })
    expect(relatedMocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 }))
    expect(relatedMocks.listarOrdenes).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 }))
    await screen.findByRole('option', { name: /CAS-20/ })
    fireEvent.click(screen.getByRole('button', { name: 'Más', exact: true }))
    await screen.findByRole('option', { name: /CAS-21/ })
    fireEvent.change(screen.getByLabelText('Equipo relacionado (opcional)'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Orden relacionada (opcional)'), { target: { value: '18' } })
    fireEvent.change(screen.getByLabelText('Garantía relacionada (opcional)'), { target: { value: '18' } })
    fireEvent.change(screen.getByLabelText('Caso anterior (opcional)'), { target: { value: '21' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CAS-ASOCIADO' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Caso con referencias existentes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar caso' }))
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos', expect.objectContaining({ method: 'POST' })))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ equipoId: 12, ordenId: 18, garantiaId: 18, anteriorId: 21 })
  })
  it('crea un caso sin asociaciones opcionales y confirma su referencia normalizada', async () => {
    const created = { ...caso, id: 32, referencia: 'CAS-NUEVO', activoReferencia: 'BOMBA-02', codigoFalla: 'FUGA', descripcion: 'Fuga en sello' }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST') return created as never
      return emptyPage as never
    })
    render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: ' cas-nuevo ' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Referencia del activo/ }), { target: { value: 'bomba-02' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'fuga' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Fuga en sello' } })
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2025-10-20T10:23' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar caso' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')).toBe(true))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ referencia: 'CAS-NUEVO', clienteId: 4, activoReferencia: 'BOMBA-02', codigoFalla: 'FUGA', descripcion: 'Fuga en sello' })
    expect(await screen.findByText('Caso CAS-NUEVO registrado.')).toBeTruthy()
  })

  it('valida la secuencia de plazos antes de registrar el caso', async () => {
    const created = { ...caso, id: 33, referencia: 'CAS-PLAZOS' }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST') return created as never
      return emptyPage as never
    })
    const { container } = render(<CasosCalidadPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo caso' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CAS-PLAZOS' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Referencia del activo/ }), { target: { value: 'BOMBA-01' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'FUGA' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Validación de plazos' } })
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2099-10-20T10:00' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('La fecha de apertura debe ser válida y no futura.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Apertura'), { target: { value: '2025-10-20T10:00' } })
    fireEvent.change(screen.getByLabelText('Plazo de resolución (opcional)'), { target: { value: '2025-10-20T09:00' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('El plazo de resolución debe ser igual o posterior a la apertura y al de respuesta.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Plazo de resolución (opcional)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Plazo de respuesta (opcional)'), { target: { value: '2025-10-20T09:00' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('El plazo de respuesta debe ser igual o posterior a la apertura.')).toBeTruthy()
    expect(apiMock).not.toHaveBeenCalledWith('/api/fuentes-gerenciales/calidad/casos', expect.objectContaining({ method: 'POST' }))

    fireEvent.change(screen.getByLabelText('Plazo de respuesta (opcional)'), { target: { value: '2025-10-20T11:00' } })
    fireEvent.change(screen.getByLabelText('Plazo de resolución (opcional)'), { target: { value: '2025-10-20T10:30' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByText('El plazo de resolución debe ser igual o posterior a la apertura y al de respuesta.')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Plazo de resolución (opcional)'), { target: { value: '2025-10-20T12:00' } })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')).toBe(true))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/casos' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ respuestaLimiteEn: '2025-10-20T11:00:00-06:00', resolucionLimiteEn: '2025-10-20T12:00:00-06:00' })
  })
})
