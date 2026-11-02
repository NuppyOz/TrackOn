import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FinanzasFuentesPage } from '../src/features/fuentes-gerenciales/finanzas/FinanzasFuentesPage'
import { LogisticaFuentesPage } from '../src/features/fuentes-gerenciales/logistica/LogisticaFuentesPage'
import { CalidadFuentesPage } from '../src/features/fuentes-gerenciales/calidad/CalidadFuentesPage'

vi.mock('../src/features/fuentes-gerenciales/finanzas/documentos', () => ({ ComprobantesPage: () => <p>panel comprobantes</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/facturables', () => ({ FacturablesPage: () => <p>panel facturables</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/cobros', () => ({ CobrosPage: () => <p>panel cobros</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/costos', () => ({ CostosPage: () => <p>panel costos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/articulos/ArticulosPage', () => ({ ArticulosPage: () => <p>panel artículos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/movimientos/MovimientosPage', () => ({ MovimientosPage: () => <p>panel movimientos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/compras', () => ({ ComprasGerencialesPage: () => <p>panel compras</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/herramientas', () => ({ HerramientasGerencialesPage: () => <p>panel herramientas</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/garantias', () => ({ GarantiasGerencialesPage: () => <p>panel garantías</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/casos', () => ({ CasosCalidadPage: () => <p>panel casos</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/correctivas', () => ({ CorrectivasGerencialesPage: () => <p>panel correctivas</p> }))

describe('contenedores de fuentes gerenciales', () => {
  afterEach(() => { cleanup(); window.history.replaceState({}, '', '/') })

  it('navega por todas las secciones financieras', () => {
    render(<FinanzasFuentesPage />)
    expect(screen.getByText('panel comprobantes')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Servicios realizados' })); expect(screen.getByText('panel facturables')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cobros' })); expect(screen.getByText('panel cobros')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Costos' })); expect(screen.getByText('panel costos')).toBeTruthy()
  })

  it('selecciona la sección financiera indicada por query string', () => {
    window.history.replaceState({}, '', '/?facturableId=4')
    const view = render(<FinanzasFuentesPage />); expect(screen.getByText('panel facturables')).toBeTruthy(); view.unmount()
    window.history.replaceState({}, '', '/?cobroId=5')
    render(<FinanzasFuentesPage />); expect(screen.getByText('panel cobros')).toBeTruthy()
  })

  it('navega por todas las secciones logísticas', () => {
    render(<LogisticaFuentesPage />)
    expect(screen.getByText('panel artículos')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Movimientos' })); expect(screen.getByText('panel movimientos')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Compras' })); expect(screen.getByText('panel compras')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Herramientas' })); expect(screen.getByText('panel herramientas')).toBeTruthy()
  })

  it('selecciona movimientos desde la URL', () => {
    window.history.replaceState({}, '', '/?movimientoId=8')
    render(<LogisticaFuentesPage />)
    expect(screen.getByText('panel movimientos')).toBeTruthy()
  })

  it('navega por las secciones de calidad y respeta sus enlaces directos', () => {
    render(<CalidadFuentesPage />)
    expect(screen.getByText('panel garantías')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reclamos y calidad' })); expect(screen.getByText('panel casos')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Acciones correctivas' })); expect(screen.getByText('panel correctivas')).toBeTruthy()
    cleanup()
    window.history.replaceState({}, '', '/?casoId=9')
    render(<CalidadFuentesPage />); expect(screen.getByText('panel casos')).toBeTruthy()
  })
})
