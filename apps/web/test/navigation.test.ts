import { afterEach, describe, expect, it } from 'vitest'
import { leerRuta, RUTAS } from '../src/shared/navigation'

afterEach(() => window.history.replaceState({}, '', '/'))

describe('resolución de rutas frontend', () => {
  it.each([
    [RUTAS.comercial.crm, 'comercial'],
    [RUTAS.comercial['ventas-cotizaciones'], 'comercial'],
    [RUTAS.comercial['crm-nuevo'], 'comercial'],
    ['/comercial/crm/12', 'comercial'],
    [RUTAS.comercial['catalogo-tarifas'], 'comercial'],
    [RUTAS.comercial['portal-cuentas'], 'comercial'],
    [RUTAS.inteligencia.comercial, 'inteligencia'],
    [RUTAS.inteligencia.financiero, 'inteligencia'],
    [RUTAS.inteligencia.logistico, 'inteligencia'],
    [RUTAS.inteligencia.calidad, 'inteligencia'],
    [RUTAS.inteligencia.origen.calidad, 'inteligencia'],
    [RUTAS.operaciones.ejecucion, 'operaciones'],
    [RUTAS.field.inspeccion, 'field'],
    [RUTAS.administracion.roles, 'administracion'],
    ['/ordenes/27', 'ordenes'],
  ] as const)('resuelve %s al módulo %s incluso con query string', (path, section) => {
    const route = leerRuta(`${path}?origen=referencia`)
    expect(route.valida).toBe(true)
    expect(route.seccion).toBe(section)
  })

  it('reconoce el alta nueva y rechaza rutas inexistentes sin mostrar Dashboard como si fueran válidas', () => {
    expect(leerRuta('/ordenes/nueva')).toMatchObject({ seccion: 'ordenes', ordenNueva: true, valida: true })
    expect(leerRuta('/comercial/modulo-inexistente')).toMatchObject({ seccion: 'dashboard', valida: false })
  })
})
