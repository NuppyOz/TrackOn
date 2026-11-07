import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComercialWorkspace } from '../src/features/comercial/ComercialWorkspace'
import { RUTAS } from '../src/shared/navigation'

vi.mock('../src/features/comercial/crm/CrmPage', () => ({ CrmPage: () => <p>vista CRM</p> }))
vi.mock('../src/features/comercial/cotizaciones/CotizacionesPage', () => ({ CotizacionesPage: () => <p>vista cotizaciones y ventas</p> }))
vi.mock('../src/features/comercial/tarifas/TarifasPage', () => ({ TarifasPage: () => <p>vista catálogo y tarifas</p> }))
vi.mock('../src/features/comercial/portal-cuentas/PortalCuentasPage', () => ({ PortalCuentasPage: () => <p>vista portal de cliente</p> }))
vi.mock('../src/features/clientes/ClientesManager', () => ({ default: () => <p>vista nuevo cliente</p> }))

afterEach(cleanup)

describe('rutas comerciales independientes', () => {
  it.each([
    [RUTAS.comercial.crm, 'vista CRM'],
    [RUTAS.comercial['crm-nuevo'], 'vista nuevo cliente'],
    [RUTAS.comercial['crm-contactos'], 'vista CRM'],
    ['/comercial/crm/7', 'vista CRM'],
    [RUTAS.comercial.ventas, 'vista cotizaciones y ventas'],
    [RUTAS.comercial['ventas-registradas'], 'vista cotizaciones y ventas'],
    [RUTAS.comercial.catalogo, 'vista catálogo y tarifas'],
    [RUTAS.comercial['catalogo-tarifas'], 'vista catálogo y tarifas'],
    [RUTAS.comercial['portal-cuentas'], 'vista portal de cliente'],
  ])('presenta %s directamente sin selector de navegación comercial', (ruta, vista) => {
    render(<ComercialWorkspace ruta={ruta} puedeAdministrar />)
    expect(screen.getByText(vista)).toBeTruthy()
    expect(screen.queryByLabelText('Área comercial')).toBeNull()
  })

  it('no convierte una ruta comercial desconocida en la vista CRM', () => {
    render(<ComercialWorkspace ruta="/comercial/otra-cosa" puedeAdministrar />)
    expect(screen.getByRole('alert').textContent).toContain('no existe')
    expect(screen.queryByText('vista CRM')).toBeNull()
  })
})
