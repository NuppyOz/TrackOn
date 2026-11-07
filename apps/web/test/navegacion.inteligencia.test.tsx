import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rutaCanonica } from '../src/shared/navigation'
import { AreaRegistros } from '../src/features/inteligencia/registros/AreaRegistros'
import { InteligenciaWorkspace } from '../src/features/inteligencia/InteligenciaWorkspace'

vi.mock('../src/features/fuentes-gerenciales/contratos', () => ({ ContratosFuentesPage: () => <p>panel contratos</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/documentos', () => ({ ComprobantesPage: () => <p>panel comprobantes</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/facturables', () => ({ FacturablesPage: () => <p>panel servicios</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/cobros', () => ({ CobrosPage: () => <p>panel cobros</p> }))
vi.mock('../src/features/fuentes-gerenciales/finanzas/costos', () => ({ CostosPage: () => <p>panel costos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/articulos', () => ({ ArticulosPage: () => <p>panel artículos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/movimientos', () => ({ MovimientosPage: () => <p>panel movimientos</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/compras', () => ({ ComprasGerencialesPage: () => <p>panel compras</p> }))
vi.mock('../src/features/fuentes-gerenciales/logistica/herramientas', () => ({ HerramientasGerencialesPage: () => <p>panel herramientas</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/garantias', () => ({ GarantiasGerencialesPage: () => <p>panel garantías</p> }))
vi.mock('../src/features/fuentes-gerenciales/calidad/casos', () => ({
  CasosCalidadPage: ({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) => (
    <div><p>panel casos</p><button type="button" onClick={() => onBusyChange?.(true)}>simular guardado</button></div>
  ),
}))
vi.mock('../src/features/fuentes-gerenciales/calidad/correctivas', () => ({ CorrectivasGerencialesPage: () => <p>panel correctivas</p> }))
vi.mock('../src/features/fuentes-gerenciales/procedencia/CoberturaPage', () => ({ CoberturaPage: () => <p>panel cobertura</p> }))
vi.mock('../src/features/inteligencia/comercial', () => ({ IndicadoresComercialesPage: () => <p>tablero comercial</p> }))
vi.mock('../src/features/inteligencia/financiero', () => ({ IndicadoresFinancierosPage: () => <p>tablero financiero</p> }))
vi.mock('../src/features/inteligencia/logistico', () => ({ IndicadoresLogisticosPage: () => <p>tablero logístico</p> }))
vi.mock('../src/features/inteligencia/calidad', () => ({ IndicadoresCalidadPage: () => <p>tablero calidad</p> }))

afterEach(() => { cleanup(); window.history.replaceState({}, '', '/') })

describe('Navegación de Inteligencia', () => {
  describe('rutas canónicas', () => {
    it('lleva las rutas de registros de origen al área correcta', () => {
      expect(rutaCanonica('/inteligencia/origen/contratos', '')).toBe('/inteligencia/comercial/registros?fuente=contratos')
      expect(rutaCanonica('/inteligencia/origen/logistica', '')).toBe('/inteligencia/logistico/registros?fuente=articulos')
      expect(rutaCanonica('/inteligencia/origen/calidad', '')).toBe('/inteligencia/calidad/registros?fuente=garantias')
    })

    it('conserva la consulta y elige la fuente por el parámetro del registro', () => {
      expect(rutaCanonica('/inteligencia/origen/finanzas', '?cobroId=9')).toBe('/inteligencia/financiero/registros?cobroId=9&fuente=cobros')
      expect(rutaCanonica('/inteligencia/origen/calidad', '?casoId=31')).toBe('/inteligencia/calidad/registros?casoId=31&fuente=casos')
      expect(rutaCanonica('/inteligencia/origen/finanzas', '?facturableId=8')).toBe('/inteligencia/financiero/registros?facturableId=8&fuente=servicios')
    })

    it('mueve la operación fuera de Inteligencia y deja pasar las rutas nuevas', () => {
      expect(rutaCanonica('/inteligencia/operacion/seguimiento', '')).toBe('/operacion/seguimiento')
      expect(rutaCanonica('/inteligencia', '')).toBe('/inteligencia/comercial')
      expect(rutaCanonica('/inteligencia/financiero', '')).toBeNull()
      expect(rutaCanonica('/inteligencia/financiero/registros', '?fuente=cobros')).toBeNull()
      expect(rutaCanonica('/inteligencia/cobertura', '')).toBeNull()
      expect(rutaCanonica('/empleados', '')).toBeNull()
    })
  })

  describe('fuentes de registro', () => {
    it('cambia de fuente con la URL y no con estado interno', () => {
      window.history.replaceState({}, '', '/inteligencia/financiero/registros')
      render(<AreaRegistros area="financiero" />)
      expect(screen.getByText('panel comprobantes')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cobros' }))
      expect(window.location.search).toBe('?fuente=cobros')
      expect(screen.getByText('panel cobros')).toBeTruthy()
      // El chip activo se marca como filtro, no como pestaña de navegación.
      expect(screen.getByRole('button', { name: 'Cobros' }).getAttribute('aria-pressed')).toBe('true')
    })

    it('abre la fuente indicada en la URL', () => {
      window.history.replaceState({}, '', '/inteligencia/logistico/registros?fuente=compras')
      render(<AreaRegistros area="logistico" />)
      expect(screen.getByText('panel compras')).toBeTruthy()
    })

    it('mantiene los movimientos accesibles desde la URL del tablero', () => {
      window.history.replaceState({}, '', '/inteligencia/logistico/registros?movimientoId=8&fuente=movimientos')
      render(<AreaRegistros area="logistico" />)
      expect(screen.getByText('panel movimientos')).toBeTruthy()
    })
  })

  describe('cascarón del área', () => {
    it('muestra una sola fila con tablero y registros, y el área elegida', () => {
      render(<InteligenciaWorkspace ruta="/inteligencia/financiero" />)
      expect(screen.getByText('tablero financiero')).toBeTruthy()
      const nav = screen.getByRole('navigation', { name: 'Financiero: tablero y registros' })
      expect(nav.querySelectorAll('button')).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Tablero' }).getAttribute('aria-current')).toBe('page')
      expect(screen.getByRole('link', { name: 'Cobertura de los datos' })).toBeTruthy()
    })

    it('abre los registros del área desde la segunda pestaña', () => {
      window.history.replaceState({}, '', '/inteligencia/calidad/registros?fuente=casos')
      render(<InteligenciaWorkspace ruta="/inteligencia/calidad/registros" />)
      expect(screen.getByText('panel casos')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Registros' }).getAttribute('aria-current')).toBe('page')
    })

    it('sirve la cobertura sin pestañas de área', () => {
      render(<InteligenciaWorkspace ruta="/inteligencia/cobertura" />)
      expect(screen.getByText('panel cobertura')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Tablero' })).toBeNull()
    })
  })

  describe('detalles del panel de registros', () => {
    it('no dibuja chips cuando el área tiene una sola fuente', () => {
      window.history.replaceState({}, '', '/inteligencia/comercial/registros')
      render(<AreaRegistros area="comercial" />)
      expect(screen.getByText('panel contratos')).toBeTruthy()
      expect(screen.queryByRole('group', { name: /Fuente de los registros/ })).toBeNull()
    })

    it('vuelve a la primera fuente cuando la URL trae una que no existe', () => {
      window.history.replaceState({}, '', '/inteligencia/logistico/registros?fuente=inventada')
      render(<AreaRegistros area="logistico" />)
      expect(screen.getByText('panel artículos')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Artículos' }).getAttribute('aria-pressed')).toBe('true')
    })

    it('avisa mientras el registro se está guardando', () => {
      window.history.replaceState({}, '', '/inteligencia/calidad/registros?fuente=casos')
      render(<AreaRegistros area="calidad" />)
      expect(screen.queryByText('Guardando…')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'simular guardado' }))
      expect(screen.getByRole('status').textContent).toContain('Guardando')
    })
  })
})
