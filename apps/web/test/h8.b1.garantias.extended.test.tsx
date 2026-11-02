import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/shared/api'
import { listarEquipos } from '../src/features/equipos/equipos.api'
import { listarOrdenes } from '../src/features/ordenes/ordenes.api'
import { GarantiasGerencialesPage } from '../src/features/fuentes-gerenciales/calidad/garantias'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))
vi.mock('../src/features/equipos/equipos.api', () => ({ listarEquipos: vi.fn() }))
vi.mock('../src/features/ordenes/ordenes.api', () => ({ listarOrdenes: vi.fn() }))

const apiMock = vi.mocked(api)
const equiposMock = vi.mocked(listarEquipos)
const ordenesMock = vi.mocked(listarOrdenes)
const equipo = { id: 77, codigo: 'EQ-77', tipo: 'Bomba', numeroSerie: 'SER-77', activo: true }
const orden = { id: 88, numero: 'OT-88', estadoCodigo: 'COMPLETADA' }

afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, '', '/') })

describe('H8 garantías extendidas', () => {
  it('carga páginas de equipos y órdenes del cliente y guarda los vínculos seleccionados', async () => {
    equiposMock.mockResolvedValueOnce({ items: [equipo], pagina: 1, limite: 25, hayMas: true } as never)
      .mockResolvedValueOnce({ items: [{ ...equipo, id: 78, codigo: 'EQ-78', activo: false }], pagina: 2, limite: 25, hayMas: false } as never)
    ordenesMock.mockResolvedValue({ items: [orden], pagina: 1, limite: 25, hayMas: false } as never)
    apiMock.mockImplementation(async (url, init) => {
      if (url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST') return { id: 19, referencia: 'GAR-19', clienteId: 4, clienteNombre: 'Ana Ruiz', tipo: 'EQUIPO', activoReferencia: 'SER-77', equipoId: 77, ordenId: 88, inicio: '2027-01-01T16:00:00.000Z', fin: '2028-01-01T16:00:00.000Z', cobertura: 'Compresor', exclusiones: null, registradaEn: '2026-11-01T16:00:00.000Z', estado: 'FUTURA' } as never
      return { items: [], pagina: 1, limite: 25, hayMas: false } as never
    })
    render(<GarantiasGerencialesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nueva garantía' }))
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'gar-19' } })
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    await screen.findByRole('option', { name: 'EQ-77 · Bomba · SER-77' })
    await screen.findByRole('option', { name: /EQ-78/ })
    await screen.findByRole('option', { name: /OT-88 · COMPLETADA/ })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'EQUIPO' } })
    fireEvent.change(screen.getByLabelText('Referencia del activo'), { target: { value: 'ser-77' } })
    fireEvent.change(screen.getByLabelText('Equipo relacionado (opcional)'), { target: { value: '77' } })
    fireEvent.change(screen.getByLabelText('Orden de origen (opcional)'), { target: { value: '88' } })
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2027-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2028-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Cobertura'), { target: { value: 'Compresor' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar garantía' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url, init]) => url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST')).toBe(true))
    const post = apiMock.mock.calls.find(([url, init]) => url === '/api/fuentes-gerenciales/calidad/garantias' && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ tipo: 'EQUIPO', equipoId: 77, ordenId: 88 })
    expect(screen.getByText('Equipo #77')).toBeTruthy()
    expect(screen.getByText('Orden #88')).toBeTruthy()
  })
})
