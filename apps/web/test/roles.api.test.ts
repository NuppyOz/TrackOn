import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarRoles } from '../src/features/roles/roles.api'

describe('listarRoles', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('valida el estado HTTP y cada campo de los roles recibidos', async () => {
    const rol = { id: 2, cod: 'ADMIN', nombre: 'Administrador', descripcion: null }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [rol] }) })
    vi.stubGlobal('fetch', fetchMock)
    await expect(listarRoles()).resolves.toEqual([rol])
    expect(fetchMock).toHaveBeenCalledWith('/api/roles', expect.objectContaining({ signal: expect.any(AbortSignal) }))

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ data: [] }) })
    await expect(listarRoles()).rejects.toThrow('No se pudieron obtener los roles.')

    const invalidResponses: unknown[] = [null, 2, {}, { data: null }, { data: {} }, { data: [null] },
      { data: [{ ...rol, id: '2' }] }, { data: [{ ...rol, id: 1.5 }] }, { data: [{ ...rol, id: 0 }] },
      { data: [{ id: 1, nombre: 'Admin', descripcion: null }] }, { data: [{ ...rol, cod: 2 }] },
      { data: [{ id: 1, cod: 'A', descripcion: null }] }, { data: [{ ...rol, nombre: 4 }] },
      { data: [{ id: 1, cod: 'A', nombre: 'Admin' }] }, { data: [{ ...rol, descripcion: 4 }] }]
    for (const body of invalidResponses) {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body })
      await expect(listarRoles()).rejects.toThrow('La respuesta de roles tiene un formato inadecuado.')
    }
  })
})
