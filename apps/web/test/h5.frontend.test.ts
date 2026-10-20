import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/shared/api'
import { crearContrato, listarContratos, renovarContrato } from '../src/features/fuentes-gerenciales/contratos/contratos.api'
import { historialCobertura, guardarCobertura } from '../src/features/fuentes-gerenciales/procedencia/procedencia.api'
import { consultarTableroComercial } from '../src/features/inteligencia/comercial/comercial.api'

vi.mock('../src/shared/api', () => ({ api: vi.fn() }))
const apiMock = vi.mocked(api)
describe('H5: APIs de cobertura, contratos y tablero', () => {
  afterEach(() => vi.clearAllMocks())
  it('mantiene los filtros backend de contratos y la paginación', async () => {
    apiMock.mockResolvedValueOnce({ items: [], pagina: 2, limite: 25, hayMas: false })
    await listarContratos({ q: 'Mantenimiento', clienteId: 7, pagina: 2, limite: 25 })
    expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/contratos?q=Mantenimiento&clienteId=7&pagina=2&limite=25')
  })
  it('usa Idempotency-Key estable para alta y renovación', async () => {
    apiMock.mockResolvedValue({ id: 1 })
    const body = { clienteId: 7, referencia: 'CT-7', inicio: '2026-10-01T06:00:00.000Z', fin: '2027-10-01T06:00:00.000Z', importe: '1250.00' }
    await crearContrato(body, 'fixed-operation-key-001')
    expect(apiMock).toHaveBeenLastCalledWith('/api/fuentes-gerenciales/contratos', expect.objectContaining({ method: 'POST', headers: { 'Idempotency-Key': 'fixed-operation-key-001' }, body: JSON.stringify(body) }))
    await renovarContrato(1, 3, { referencia: 'CT-7-R1', inicio: '2027-10-01T06:00:00.000Z', fin: '2028-10-01T06:00:00.000Z', importe: '1350.00' }, 'fixed-renew-key-001')
    expect(apiMock).toHaveBeenLastCalledWith('/api/fuentes-gerenciales/contratos/1/renovar', expect.objectContaining({ headers: { 'Idempotency-Key': 'fixed-renew-key-001' }, body: expect.stringContaining('"version":3') }))
  })
  it('envía cobertura optimista e historial paginado', async () => {
    apiMock.mockResolvedValueOnce({ area: 'COMERCIAL' }).mockResolvedValueOnce({ items: [], pagina: 3, limite: 10, hayMas: true })
    await guardarCobertura('COMERCIAL', { version: 0, desde: '2026-09-01T06:00:00.000Z', hastaVerificada: '2026-10-01T06:00:00.000Z' })
    expect(apiMock).toHaveBeenNthCalledWith(1, '/api/fuentes-gerenciales/cobertura/COMERCIAL', expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"version":0') }))
    await historialCobertura('COMERCIAL', 3)
    expect(apiMock).toHaveBeenNthCalledWith(2, '/api/fuentes-gerenciales/cobertura/COMERCIAL/historial?pagina=3&limite=10')
  })
  it('consulta el tablero H.5 con ambas fechas ISO', async () => {
    apiMock.mockResolvedValueOnce({ metricas: [], desgloses: [] })
    await consultarTableroComercial('2026-09-01T06:00:00.000Z', '2026-10-01T06:00:00.000Z')
    expect(apiMock).toHaveBeenCalledWith('/api/inteligencia/comercial?desde=2026-09-01T06%3A00%3A00.000Z&hasta=2026-10-01T06%3A00%3A00.000Z')
  })
})
