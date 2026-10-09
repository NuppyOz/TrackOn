import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cambiarEstadoEquipo,
  crearEquipo,
  editarEquipo,
  listarEquipos,
  listarUbicaciones,
} from '../src/features/equipos/equipos.api'
import type { EquipoFiltros, EquipoInput } from '../src/features/equipos/equipos.types'

const mocks = vi.hoisted(() => ({ api: vi.fn() }))

vi.mock('../src/shared/api', () => ({ api: mocks.api }))

const filtros: EquipoFiltros = {
  clienteId: '',
  ubicacionId: '',
  codigo: '',
  numeroSerie: '',
  estado: 'activos',
}

const equipoNuevo: EquipoInput = {
  ubicacionId: 10,
  codigo: 'EQ-042',
  tipo: 'Aire acondicionado',
  marca: 'Carrier',
  modelo: 'X1',
  numeroSerie: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.api.mockResolvedValue({ items: [], hayMas: false })
})

describe('API de equipos — TK-03', () => {
  it('consulta las ubicaciones con su ruta correspondiente', async () => {
    await listarUbicaciones()
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos/ubicaciones')
  })

  it('usa el estado activos por defecto y omite filtros vacíos', async () => {
    await listarEquipos(filtros)
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos?estado=activos')
  })

  it('envía los filtros seleccionados y la paginación', async () => {
    await listarEquipos({
      ...filtros,
      clienteId: '7',
      ubicacionId: '10',
      codigo: 'EQ 042',
      numeroSerie: 'S/100',
      estado: 'todos',
      pagina: 2,
      limite: 25,
    })

    expect(mocks.api).toHaveBeenCalledTimes(1)
    const [ruta] = mocks.api.mock.calls[0] as [string]
    const url = new URL(ruta, 'http://localhost')
    expect(url.pathname).toBe('/api/equipos')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      clienteId: '7',
      ubicacionId: '10',
      codigo: 'EQ 042',
      numeroSerie: 'S/100',
      estado: 'todos',
      pagina: '2',
      limite: '25',
    })
  })

  it('omite los parámetros opcionales undefined sin eliminar el cero numérico', async () => {
    await listarEquipos({ ...filtros, pagina: undefined, limite: 0 })
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos?estado=activos&limite=0')
  })

  it('registra equipos mediante POST enviando sus campos en JSON', async () => {
    await crearEquipo(equipoNuevo)
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos', {
      method: 'POST',
      body: JSON.stringify(equipoNuevo),
    })
  })

  it('edita equipos mediante PATCH sin reenviar campos no modificados', async () => {
    const cambios: Partial<EquipoInput> = { modelo: 'X2', numeroSerie: null }
    await editarEquipo(42, cambios)
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos/42', {
      method: 'PATCH',
      body: JSON.stringify(cambios),
    })
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).not.toHaveProperty('ubicacionId')
  })

  it('desactiva el equipo mediante PATCH con activo=false', async () => {
    await cambiarEstadoEquipo(42, false)
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos/42/estado', {
      method: 'PATCH',
      body: JSON.stringify({ activo: false }),
    })
  })

  it('reactiva el equipo mediante PATCH con activo=true', async () => {
    await cambiarEstadoEquipo(42, true)
    expect(mocks.api).toHaveBeenCalledWith('/api/equipos/42/estado', {
      method: 'PATCH',
      body: JSON.stringify({ activo: true }),
    })
  })

  it('devuelve el resultado del cliente HTTP', async () => {
    const respuesta = { id: 42, codigo: 'EQ-042' }
    mocks.api.mockResolvedValueOnce(respuesta)
    await expect(editarEquipo(42, { codigo: 'EQ-042' })).resolves.toBe(respuesta)
  })

  it('propaga los errores del cliente HTTP para que la interfaz los gestione', async () => {
    const error = new Error('Equipo duplicado')
    mocks.api.mockRejectedValueOnce(error)
    await expect(crearEquipo(equipoNuevo)).rejects.toBe(error)
  })
})
