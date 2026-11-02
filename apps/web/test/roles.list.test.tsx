import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RolesList from '../src/features/roles/RolesList'
import { listarRoles } from '../src/features/roles/roles.api'

vi.mock('../src/features/roles/roles.api', () => ({ listarRoles: vi.fn() }))
const listar = vi.mocked(listarRoles)

describe('RolesList', () => {
  afterEach(() => { cleanup(); vi.resetAllMocks() })

  it('presenta el estado inicial, roles, lista vacía y error', async () => {
    const pending: { resolve?: (value: Awaited<ReturnType<typeof listarRoles>>) => void } = {}
    listar.mockImplementationOnce(() => new Promise(resolve => { pending.resolve = resolve }))
    const { rerender } = render(<RolesList />)
    expect(screen.getByText('Presiona el botón para consultar los roles.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Consultar roles' }))
    expect(screen.getByText('Consultando los roles…')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Cargando…' }) as HTMLButtonElement).disabled).toBe(true)
    pending.resolve?.([{ id: 1, cod: 'ADMIN', nombre: 'Administrador', descripcion: null }])
    expect(await screen.findByText('Roles encontrados: 1.')).toBeTruthy()
    expect(screen.getByText('Sin descripción')).toBeTruthy()

    listar.mockResolvedValueOnce([])
    rerender(<RolesList />)
    fireEvent.click(screen.getByRole('button', { name: 'Consultar roles' }))
    expect(await screen.findByText('No hay roles registrados.')).toBeTruthy()

    listar.mockRejectedValueOnce(new Error('fallo'))
    fireEvent.click(screen.getByRole('button', { name: 'Consultar roles' }))
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudieron cargar los roles.')
  })
})
