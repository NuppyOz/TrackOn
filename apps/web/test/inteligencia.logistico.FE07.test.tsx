import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/shared/api'
import { IndicadoresLogisticosPage } from '../src/features/inteligencia/logistico/IndicadoresLogisticosPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
const apiMock = vi.mocked(api)
const articleOptions = { items: [{ id: 1, codigo: 'ART-1', nombre: 'Bomba', unidad: 'unidad', minimo: '1.000', saldoCantidad: '0.000', saldoValor: '0.000000167', costoPromedio: null, ultimaFecha: '2026-10-01T12:00:00.000Z', version: 1, materialId: null, creadoEn: '2026-10-01T12:00:00.000Z' }, { id: 2, codigo: 'ART-2', nombre: 'Cable', unidad: 'metro', minimo: '0.000', saldoCantidad: '2.000', saldoValor: '4.000000000', costoPromedio: '2.000000', ultimaFecha: '2026-10-01T12:00:00.000Z', version: 1, materialId: null, creadoEn: '2026-10-01T12:00:00.000Z' }], pagina: 1, limite: 25, hayMas: false }
const metricas = [
  { clave: 'stock_critico_cantidad', valor: 1, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['articulos_gerenciales'], motivo: null },
  { clave: 'compras_pendientes_cantidad', valor: 1, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['compras_gerenciales'], motivo: null },
  { clave: 'herramientas_prestadas', valor: 1, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['prestamos_herramientas_gerenciales'], motivo: null },
  { clave: 'herramientas_vencidas', valor: 0, unidad: 'cantidad' as const, estado: 'CALCULADO' as const, fuentes: ['prestamos_herramientas_gerenciales'], motivo: null },
  { clave: 'inventario_valorizado', valor: '0.000000167', unidad: 'NIO' as const, estado: 'CALCULADO' as const, fuentes: ['articulos_gerenciales', 'movimientos_gerenciales'], motivo: null },
]
const board = {
  desde: '2026-10-01T15:00:00.000Z', hasta: '2026-10-10T15:00:00.000Z', corteEvaluacion: '2026-10-10T15:00:00.000Z', zonaHoraria: 'America/Managua' as const,
  cobertura: { estado: 'PARCIAL' as const, desde: '2026-09-01T06:00:00.000Z', hastaVerificada: '2026-10-09T06:00:00.000Z', observaciones: ['Cobertura parcial para logística.'] }, metricas, registrosSinAsignar: 0,
  desgloses: [
    { tipo: 'ARTICULO' as const, id: 1, codigo: 'ART-1', nombre: 'Bomba', unidad: 'unidad', stock: '0.000', minimo: '1.000', valor: '0.000000167', consumoNeto: '0.000', stockMedio: '0.000000', rotacion: null, motivo: 'SIN_BASE_DE_CALCULO' },
    { tipo: 'ARTICULO' as const, id: 2, codigo: 'ART-2', nombre: 'Cable', unidad: 'metro', stock: '2.000', minimo: '0.000', valor: '4.000000000', consumoNeto: '0.000', stockMedio: null, rotacion: null, motivo: 'SIN_COBERTURA_ARTICULO' },
    { tipo: 'COMPRA_LINEA' as const, id: 30, compraId: 3, compraReferencia: 'CMP-3', proveedor: 'Proveedor', articuloId: 1, articuloCodigo: 'ART-1', unidad: 'unidad', cantidad: '2.000', recibido: '1.000', cancelado: '0.000', pendiente: '1.000', prometidaEn: '2026-10-11T15:00:00.000Z' },
    { tipo: 'RECEPCION' as const, id: 40, referencia: 'REC-4', compraId: 3, compraReferencia: 'CMP-3', proveedor: 'Proveedor', articuloId: 1, articuloCodigo: 'ART-1', unidad: 'unidad', cantidad: '1.000', fecha: '2026-10-05T15:00:00.000Z', prometidaEn: '2026-10-04T15:00:00.000Z', tardia: true },
    { tipo: 'HERRAMIENTA' as const, id: 9, codigo: 'HER-9', nombre: 'Manómetro', prestamoId: 70, empleadoId: 14, empleadoNombre: 'Ana Ruiz', prestadaEn: '2026-10-01T15:00:00.000Z', previstaEn: '2026-10-08T15:00:00.000Z', vencida: true },
  ],
}

describe('Indicadores logísticos H.7', () => {
  beforeEach(() => { apiMock.mockReset(); apiMock.mockImplementation(async url => typeof url === 'string' && url.startsWith('/api/inteligencia/logistico?') ? board as never : articleOptions as never) })
  afterEach(cleanup)

  it('conserva nueve decimales y distingue existencia media cero de dato sin base', async () => {
    render(<IndicadoresLogisticosPage />)
    expect(await screen.findByText('C$ 0.000000167')).toBeTruthy()
    expect(screen.getByText(/Existencia media 0\.000000 unidad/)).toBeTruthy()
    expect(screen.getByText(/El artículo aún no tenía historial al inicio del período/)).toBeTruthy()
    expect(screen.getByText(/Existencia media Sin base/)).toBeTruthy()
    expect(screen.getByRole('note').textContent).toContain('Cobertura parcial para logística.')
    expect(screen.getByText('Recepción tardía')).toBeTruthy()
    expect(screen.getByText('Vencida al corte')).toBeTruthy()
  })

  it('filtra el dataset recibido y enlaza cada desglose al registro real', async () => {
    render(<IndicadoresLogisticosPage />)
    await screen.findByText('CMP-3 · ART-1')
    expect(screen.getByRole('link', { name: 'ART-1 · Bomba' }).getAttribute('href')).toBe('/inteligencia/origen/logistica?articuloId=1')
    expect(screen.getByRole('link', { name: 'REC-4 · CMP-3' }).getAttribute('href')).toBe('/inteligencia/origen/logistica?compraId=3')
    expect(screen.getByRole('link', { name: 'HER-9 · Manómetro' }).getAttribute('href')).toBe('/inteligencia/origen/logistica?herramientaId=9')
    fireEvent.change(screen.getByLabelText('Filtrar por artículo'), { target: { value: '1' } })
    expect(screen.queryByRole('link', { name: 'ART-2 · Cable' })).toBeNull()
    expect(screen.getByText('HER-9 · Manómetro')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tipo de registro'), { target: { value: 'RECEPCION' } })
    expect(screen.getByText('REC-4 · CMP-3')).toBeTruthy()
    expect(screen.queryByText('CMP-3 · ART-1')).toBeNull()
  })

  it('convierte el rango Managua a ISO offset y conserva cobertura/corte del servidor', async () => {
    render(<IndicadoresLogisticosPage />)
    await screen.findByRole('note')
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01T09:00:00' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-10T09:00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await waitFor(() => expect(apiMock.mock.calls.some(([url]) => typeof url === 'string' && url.includes('desde=2026-10-01T15%3A00%3A00.000Z') && url.includes('hasta=2026-10-10T15%3A00%3A00.000Z'))).toBe(true))
    expect(screen.getByText(/corte evaluado/)).toBeTruthy()
  })
})
