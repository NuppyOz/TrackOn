import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CoberturaPage } from '../src/features/fuentes-gerenciales/procedencia/CoberturaPage'
import { guardarCobertura, historialCobertura, listarCoberturas } from '../src/features/fuentes-gerenciales/procedencia/procedencia.api'

vi.mock('../src/features/fuentes-gerenciales/procedencia/procedencia.api', () => ({
  guardarCobertura: vi.fn(), historialCobertura: vi.fn(), listarCoberturas: vi.fn(),
}))

const row = { area: 'COMERCIAL' as const, desde: '2026-09-01T06:00:00.000Z', hastaVerificada: '2026-10-20T06:00:00.000Z', responsable: { id: 1, nombre: 'Ana Ruiz' }, observacion: 'Cierre mensual', version: 3 }
const audit = { id: 9, fecha: '2026-10-20T06:00:00.000Z', accion: 'ACTUALIZAR', responsable: { id: 1, nombre: 'Ana Ruiz' }, anteriores: null, nuevos: { area: 'COMERCIAL' as const, desde: row.desde, hastaVerificada: row.hastaVerificada, observacion: row.observacion, responsableId: 1, version: 3 } }
const page = { items: [audit], pagina: 1, limite: 10, hayMas: false }

const listMock = vi.mocked(listarCoberturas)
const historyMock = vi.mocked(historialCobertura)
const saveMock = vi.mocked(guardarCobertura)

describe('cobertura de fuentes gerenciales', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue([row])
    historyMock.mockReset().mockResolvedValue(page)
    saveMock.mockReset().mockResolvedValue(row)
  })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('presenta cobertura e historial y actualiza el registro existente', async () => {
    render(<CoberturaPage />)
    expect((await screen.findAllByText('Ana Ruiz')).length).toBeGreaterThan(1)
    expect(screen.getByText(/Actualización/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(screen.getByRole('heading', { name: 'Registrar cobertura · Comercial' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Observación (opcional)'), { target: { value: ' cobertura revisada ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cobertura' }))
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith('COMERCIAL', expect.objectContaining({ version: 3, observacion: 'cobertura revisada' })))
    expect(listMock).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(historyMock).toHaveBeenCalledTimes(2))
  })

  it('crea cobertura para otra área y permite cancelar', async () => {
    listMock.mockResolvedValue([])
    historyMock.mockResolvedValue({ items: [], pagina: 1, limite: 10, hayMas: false })
    render(<CoberturaPage />)
    await screen.findByText('No hay cobertura declarada')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobertura' }))
    fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'LOGISTICO' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-01T00:00' } })
    fireEvent.change(screen.getByLabelText('Hasta verificada'), { target: { value: '2026-10-20T00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cobertura' }))
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith('LOGISTICO', expect.objectContaining({ version: 0 })))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar cobertura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { name: 'Historial de cambios' })).toBeTruthy()
  })

  it('informa fallos de carga, historial y guardado y permite reintentar', async () => {
    listMock.mockRejectedValueOnce(new Error('Cobertura no disponible')).mockResolvedValue([row])
    historyMock.mockRejectedValueOnce(new Error('Historial no disponible')).mockResolvedValue(page)
    saveMock.mockRejectedValueOnce(new Error('Conflicto de versión'))
    render(<CoberturaPage />)
    expect((await screen.findAllByText(/Cobertura no disponible/)).length).toBeGreaterThan(1)
    expect(await screen.findByText(/Historial no disponible/)).toBeTruthy()
    const retries = screen.getAllByRole('button', { name: 'Reintentar' })
    fireEvent.click(retries[0]); fireEvent.click(retries.at(-1)!)
    expect((await screen.findAllByText('Ana Ruiz')).length).toBeGreaterThan(1)
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cobertura' }))
    expect(await screen.findByText(/Conflicto de versión/)).toBeTruthy()
  })
})
