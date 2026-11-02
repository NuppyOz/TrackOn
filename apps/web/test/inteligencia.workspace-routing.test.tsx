import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InteligenciaWorkspace } from '../src/features/inteligencia/InteligenciaWorkspace'
import { irA } from '../src/shared/navigation'

vi.mock('../src/shared/navigation', () => ({ irA: vi.fn() }))
vi.mock('../src/features/inteligencia/InteligenciaModule', () => ({ InteligenciaModule: ({ children }: { children: unknown }) => <section>{children as never}</section> }))
vi.mock('../src/features/fuentes-gerenciales', () => ({ FuentesGerencialesModule: ({ children }: { children: unknown }) => <section>{children as never}</section> }))
vi.mock('../src/features/fuentes-gerenciales/procedencia/CoberturaPage', () => ({ CoberturaPage: () => <p>cobertura</p> }))
vi.mock('../src/features/fuentes-gerenciales/contratos/ContratosFuentesPage', () => ({ ContratosFuentesPage: () => <p>origen comercial</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/FinanzasFuentesPage', () => ({ FinanzasFuentesPage: () => <p>origen financiero</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/LogisticaFuentesPage', () => ({ LogisticaFuentesPage: () => <p>origen logístico</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/CalidadFuentesPage', () => ({ CalidadFuentesPage: () => <p>origen calidad</p> }))
vi.mock('../src/features/inteligencia/comercial/IndicadoresComercialesPage', () => ({ IndicadoresComercialesPage: () => <p>indicador comercial</p> }))
vi.mock('../src/features/inteligencia/financiero', () => ({ IndicadoresFinancierosPage: () => <p>indicador financiero</p> }))
vi.mock('../src/features/inteligencia/logistico', () => ({ IndicadoresLogisticosPage: () => <p>indicador logístico</p> }))
vi.mock('../src/features/inteligencia/calidad', () => ({ IndicadoresCalidadPage: () => <p>indicador calidad</p> }))
vi.mock('../src/features/inteligencia/operativo/OperacionInteligentePage', () => ({ default: () => <p>operación</p> }))

describe('rutas del espacio de inteligencia', () => {
  afterEach(() => { cleanup(); vi.mocked(irA).mockReset() })

  it.each([
    ['/inteligencia/comercial', 'indicador comercial'], ['/inteligencia/financiero', 'indicador financiero'],
    ['/inteligencia/logistico', 'indicador logístico'], ['/inteligencia/calidad', 'indicador calidad'],
    ['/inteligencia/origen/contratos', 'origen comercial'], ['/inteligencia/origen/finanzas', 'origen financiero'],
    ['/inteligencia/origen/logistica', 'origen logístico'], ['/inteligencia/origen/calidad', 'origen calidad'],
    ['/inteligencia/cobertura', 'cobertura'], ['/inteligencia/operacion/resumen', 'operación'],
  ])('presenta %s', (route, expected) => {
    render(<InteligenciaWorkspace ruta={route} />)
    expect(screen.getByText(expected)).toBeTruthy()
  })

  it('navega entre operación, indicadores, origen y cobertura', () => {
    render(<InteligenciaWorkspace ruta="/inteligencia/financiero" />)
    fireEvent.click(screen.getByRole('button', { name: 'Operación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Indicadores de negocio' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registros de origen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cobertura de los datos' }))
    expect(vi.mocked(irA).mock.calls).toEqual([
      ['/inteligencia/operacion/resumen'], ['/inteligencia/financiero'], ['/inteligencia/origen/finanzas'], ['/inteligencia/cobertura'],
    ])
  })
})
