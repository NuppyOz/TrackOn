import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import EquiposManager from '../src/features/equipos/EquiposManager'
import type { Equipo, Ubicacion } from '../src/features/equipos/equipos.types'

const mocks = vi.hoisted(() => ({
  listarEquipos: vi.fn(),
  listarUbicaciones: vi.fn(),
  crearEquipo: vi.fn(),
  editarEquipo: vi.fn(),
  cambiarEstadoEquipo: vi.fn(),
}))

vi.mock('../src/features/equipos/equipos.api', () => mocks)

const ubicacion: Ubicacion = {
  id: 10,
  nombre: 'Sucursal Centro',
  direccion: 'Managua',
  activa: true,
  cliente: {
    id: 7,
    codigo: 'CLI-007',
    activo: true,
    persona: { firstName: 'Ana', firstLastName: 'López' },
    organizacion: null,
  },
}

const equipo: Equipo = {
  id: 42,
  codigo: 'EQ-042',
  tipo: 'Aire acondicionado',
  marca: 'Carrier',
  modelo: 'X1',
  numeroSerie: 'SER-100',
  activo: true,
  ubicacion,
}

function pagina(items: Equipo[] = [equipo], hayMas = false) {
  return { items, pagina: 1, limite: 25, hayMas }
}

async function esperarListado() {
  await screen.findByRole('cell', { name: /EQ-042/ })
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.listarUbicaciones.mockResolvedValue([ubicacion])
  mocks.listarEquipos.mockResolvedValue(pagina())
  mocks.crearEquipo.mockResolvedValue(equipo)
  mocks.editarEquipo.mockResolvedValue(equipo)
  mocks.cambiarEstadoEquipo.mockResolvedValue(equipo)
})

describe('Gestión de Equipos — TK-03', () => {
  it('consulta ubicaciones y carga el inventario inicial', async () => {
    render(<EquiposManager />)
    await esperarListado()
    expect(within(screen.getByRole('table')).getByText('CLI-007 · Ana López')).toBeTruthy()
    expect(screen.getByText('SER-100')).toBeTruthy()
    expect(mocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ estado: 'activos', pagina: 1, limite: 25 }))
  })

  it('muestra el estado vacío cuando no hay registros', async () => {
    mocks.listarEquipos.mockResolvedValue(pagina([]))
    render(<EquiposManager />)
    expect(await screen.findByText('No hay equipos que coincidan con los filtros.')).toBeTruthy()
  })

  it('muestra los errores de consulta al inventario', async () => {
    mocks.listarEquipos.mockRejectedValue(new Error('Servidor no disponible'))
    render(<EquiposManager />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Servidor no disponible')
  })

  it('muestra un error si no se pueden consultar las ubicaciones', async () => {
    mocks.listarUbicaciones.mockRejectedValue(new Error('Ubicaciones inaccesibles'))
    render(<EquiposManager />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Ubicaciones inaccesibles')
  })

  it('busca por filtros y permite restablecerlos', async () => {
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar por código' }), { target: { value: 'EQ-042' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado' }), { target: { value: 'todos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(mocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ codigo: 'EQ-042', estado: 'todos', pagina: 1 })))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    await waitFor(() => expect(mocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ codigo: '', estado: 'activos', pagina: 1 })))
  })

  it('filtra las ubicaciones por cliente', async () => {
    const otra: Ubicacion = { ...ubicacion, id: 11, nombre: 'Otra sede', cliente: { ...ubicacion.cliente, id: 8, codigo: 'CLI-008' } }
    mocks.listarUbicaciones.mockResolvedValue([ubicacion, otra])
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por cliente' }), { target: { value: '7' } })
    const select = screen.getByRole('combobox', { name: 'Filtrar por ubicación' })
    expect(within(select).getByRole('option', { name: 'Sucursal Centro' })).toBeTruthy()
    expect(within(select).queryByRole('option', { name: 'Otra sede' })).toBeNull()
  })

  it('avanza y retrocede páginas', async () => {
    mocks.listarEquipos.mockImplementation(async (filtros: { pagina: number }) => pagina([equipo], filtros.pagina === 1))
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(mocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })))
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await waitFor(() => expect(mocks.listarEquipos).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1 })))
  })

  it('registra equipos y recarga el inventario', async () => {
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Código' }), { target: { value: 'EQ-043' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Tipo' }), { target: { value: 'Refrigerador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    await waitFor(() => expect(mocks.crearEquipo).toHaveBeenCalledWith(expect.objectContaining({ ubicacionId: 10, codigo: 'EQ-043', tipo: 'Refrigerador' })))
    expect(await screen.findByText('Equipo registrado correctamente.')).toBeTruthy()
  })

  it('impide registrar equipos en ubicaciones inactivas', async () => {
    mocks.listarUbicaciones.mockResolvedValue([{ ...ubicacion, activa: false }])
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: /Registrar equipo/ }))
    const select = screen.getByRole('combobox')
    expect(within(select).getByRole('option', { name: /inactiva/ }).hasAttribute('disabled')).toBe(true)
  })

  it('edita un equipo sin reenviar su ubicación original', async () => {
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Modelo' }), { target: { value: 'X2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(mocks.editarEquipo).toHaveBeenCalledWith(42, expect.objectContaining({ modelo: 'X2' })))
    const [, cambios] = mocks.editarEquipo.mock.calls[0]
    expect(cambios).not.toHaveProperty('ubicacionId')
  })

  it('conserva una ubicación histórica inactiva al editar', async () => {
    const historico = { ...equipo, ubicacion: { ...ubicacion, activa: false } }
    mocks.listarEquipos.mockResolvedValue(pagina([historico]))
    mocks.listarUbicaciones.mockResolvedValue([])
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByText(/La ubicación original está inactiva/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(mocks.editarEquipo).toHaveBeenCalled())
    expect(mocks.editarEquipo.mock.calls[0][1]).not.toHaveProperty('ubicacionId')
  })

  it('muestra errores al guardar y conserva el formulario', async () => {
    mocks.editarEquipo.mockRejectedValue(new Error('Código duplicado'))
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Código duplicado')
    expect(screen.getByRole('textbox', { name: 'Código' })).toBeTruthy()
  })

  it('desactiva un equipo y vuelve a consultar la lista', async () => {
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    await waitFor(() => expect(mocks.cambiarEstadoEquipo).toHaveBeenCalledWith(42, false))
    expect(await screen.findByText('Equipo desactivado.')).toBeTruthy()
  })

  it('reactiva equipos inactivos', async () => {
    mocks.listarEquipos.mockResolvedValue(pagina([{ ...equipo, activo: false }]))
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }))
    await waitFor(() => expect(mocks.cambiarEstadoEquipo).toHaveBeenCalledWith(42, true))
  })

  it('muestra errores cuando falla el cambio de estado', async () => {
    mocks.cambiarEstadoEquipo.mockRejectedValue(new Error('Sin permiso'))
    render(<EquiposManager />)
    await esperarListado()
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin permiso')
  })
})
