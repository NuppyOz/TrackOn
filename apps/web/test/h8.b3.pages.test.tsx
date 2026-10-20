import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../src/shared/api'
import { IndicadoresCalidadPage } from '../src/features/inteligencia/calidad'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
const apiMock = vi.mocked(api)
const metricDefs = [
  ['garantias_vigentes', 3, 'cantidad'], ['reclamos_abiertos', 4, 'cantidad'], ['reincidencias', 1, 'cantidad'], ['retrabajos', 2, 'cantidad'],
  ['fallas_repetidas_grupos', 1, 'cantidad'], ['sla_respuesta_porcentaje', '50.00', 'porcentaje'], ['sla_resolucion_porcentaje', null, 'porcentaje'],
  ['correctivas_abiertas', 2, 'cantidad'], ['correctivas_vencidas', 1, 'cantidad'],
] as const
const metrics = metricDefs.map(([clave, valor, unidad]) => ({ clave, valor, unidad, estado: valor === null ? 'SIN_BASE_DE_CALCULO' as const : 'CALCULADO' as const, fuentes: ['casos_calidad_gerenciales'], motivo: valor === null ? 'No hay plazos evaluables.' : null, ...(clave === 'sla_respuesta_porcentaje' ? { base: { numerador: 1, denominador: 2 } } : clave === 'sla_resolucion_porcentaje' ? { base: { numerador: 0, denominador: 0 } } : {}) }))
const board = {
  desde: '2026-10-01T06:00:00.000Z', hasta: '2026-11-05T06:00:00.000Z', corteEvaluacion: '2026-10-20T18:00:00.000Z', zonaHoraria: 'America/Managua' as const,
  cobertura: { estado: 'PARCIAL' as const, desde: '2026-09-01T06:00:00.000Z', hastaVerificada: '2026-10-20T18:00:00.000Z', observaciones: ['Cobertura registrada parcialmente.'] }, metricas: metrics, registrosSinAsignar: 2,
  desgloses: [
    { tipo: 'GARANTIA' as const, id: 21, referencia: 'GAR-21', clienteId: 4, clienteNombre: 'Ana Ruiz', activoReferencia: 'BOMBA-1', inicio: '2026-09-15T06:00:00.000Z', fin: '2027-09-15T06:00:00.000Z', vigente: true },
    { tipo: 'CASO' as const, id: 31, referencia: 'CAS-31', clienteId: 4, clienteNombre: 'Ana Ruiz', activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', abiertaEn: '2026-10-04T12:00:00.000Z', anteriorId: null, respondidaEn: '2026-10-04T13:00:00.000Z', resueltaEn: null, cerradaEn: null, respuestaLimiteEn: '2026-10-04T14:00:00.000Z', resolucionLimiteEn: null, estadoAlCorte: 'EN_ATENCION' as const, respuestaEvaluable: true, respuestaCumple: true, resolucionEvaluable: false, resolucionCumple: null },
    { tipo: 'RETRABAJO' as const, id: 41, casoId: 31, casoReferencia: 'CAS-31', referenciaTrabajo: 'OTR-41', fechaEfectiva: '2026-10-05T12:00:00.000Z', ordenId: 18 },
    { tipo: 'CORRECTIVA' as const, id: 51, casoId: 31, casoReferencia: 'CAS-31', descripcion: 'Cambiar sello', responsableId: 5, responsableNombre: 'Luz Paz', creadaEn: '2026-10-05T12:00:00.000Z', venceEn: '2026-10-10T12:00:00.000Z', cerradaEn: null, abiertaAlCorte: true, vencidaAlCorte: true },
    { tipo: 'FALLA_REPETIDA' as const, clave: 'internal-group-key', clienteId: 4, activoReferencia: 'BOMBA-1', codigoFalla: 'FUGA', cantidad: 2, casoIds: [31, 32] },
  ],
}

describe('H8 B3 dashboard', () => {
  beforeEach(() => apiMock.mockReset())
  afterEach(cleanup)
  it('muestra nueve métricas, cobertura/corte, tasas sin base y enlaces a registros reales', async () => {
    apiMock.mockResolvedValue(board)
    render(<IndicadoresCalidadPage />)
    expect(await screen.findByText('Indicadores de calidad')).toBeTruthy()
    for (const label of ['Garantías vigentes', 'Reclamos abiertos', 'Reincidencias', 'Retrabajos', 'Grupos de fallas repetidas', 'SLA de respuesta', 'SLA de resolución', 'Acciones correctivas abiertas', 'Acciones correctivas vencidas']) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 de 2 plazos evaluables').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin base').length).toBeGreaterThan(0)
    expect(screen.getByText('Casos con plazos incompletos al corte:').textContent).toContain('2')
    expect(screen.getByText(/Cobertura parcial/)).toBeTruthy()
    expect(screen.getByText(/Corte evaluado:/)).toBeTruthy()
    expect((screen.getByRole('link', { name: 'GAR-21' }) as HTMLAnchorElement).getAttribute('href')).toBe('/inteligencia/origen/calidad?garantiaId=21')
    expect((screen.getByRole('link', { name: 'CAS-31' }) as HTMLAnchorElement).getAttribute('href')).toBe('/inteligencia/origen/calidad?casoId=31')
    expect((screen.getByRole('link', { name: 'Cambiar sello' }) as HTMLAnchorElement).getAttribute('href')).toBe('/inteligencia/origen/calidad?correctivaId=51')
    for (const id of [31, 32]) expect((screen.getByRole('link', { name: `Caso #${id}` }) as HTMLAnchorElement).getAttribute('href')).toBe(`/inteligencia/origen/calidad?casoId=${id}`)
    expect(screen.queryByText('internal-group-key')).toBeNull()
    expect(screen.getByText('2 casos agrupados por cliente, activo y falla')).toBeTruthy()
  })
  it('envía rangos Managua con segundos y limita desgloses localmente por tipo, activo y falla', async () => {
    apiMock.mockResolvedValue(board)
    render(<IndicadoresCalidadPage />)
    await screen.findByRole('heading', { name: 'Indicadores del período' })
    const first = new URL(String(apiMock.mock.calls[0]?.[0]), 'http://localhost')
    for (const field of ['desde', 'hasta']) expect(first.searchParams.get(field)).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01T09:10:11' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-20T10:11:12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    await waitFor(() => expect(apiMock.mock.calls.length).toBeGreaterThan(1))
    const requested = new URL(String(apiMock.mock.calls.at(-1)?.[0]), 'http://localhost')
    expect(requested.searchParams.get('desde')).toBe('2026-10-01T15:10:11.000Z')
    expect(requested.searchParams.get('hasta')).toBe('2026-10-20T16:11:12.000Z')
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'FALLA_REPETIDA' } })
    fireEvent.change(screen.getByLabelText('Activo'), { target: { value: 'bomba' } })
    fireEvent.change(screen.getByLabelText('Código de falla'), { target: { value: 'fuga' } })
    expect(screen.getByRole('link', { name: 'Caso #31' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'GAR-21' })).toBeNull()
  })
})
