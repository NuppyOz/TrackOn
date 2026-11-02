import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../src/shared/api'
import { IndicadoresComercialesPage } from '../src/features/inteligencia/comercial/IndicadoresComercialesPage'
import { ContratosFuentesPage } from '../src/features/fuentes-gerenciales/contratos/ContratosFuentesPage'

vi.mock('../src/shared/api', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/shared/api')>()
  return { ...actual, api: vi.fn() }
})
vi.mock('../src/features/clientes/clientes.api', () => ({ listarClientes: vi.fn().mockResolvedValue([{ id: 4, codigo: 'CLI-4', activo: true, telefonoComercial: null, correoComercial: null, persona: { firstName: 'Ana', secondName: null, firstLastName: 'Ruiz', secondLastName: null, typeDocument: null, numberDocument: null, telephone: null, correo: null }, organizacion: null }]) }))
const apiMock = vi.mocked(api)
const metrics = [
  ['cotizaciones_total', 2, 'cantidad'], ['conversion_porcentaje', '50.00', 'porcentaje'], ['ventas_cantidad', 1, 'cantidad'],
  ['ventas_importe', '1200.00', 'NIO'], ['clientes_con_ventas', 1, 'cantidad'], ['ticket_promedio', '1200.00', 'NIO'],
  ['contratos_activos', 1, 'cantidad'], ['renovaciones_cantidad', 0, 'cantidad'], ['renovacion_porcentaje', null, 'porcentaje'],
].map(([clave, valor, unidad]) => ({ clave: String(clave), valor: valor as number | string | null, unidad: unidad as 'cantidad' | 'NIO' | 'porcentaje', estado: valor === null ? 'SIN_BASE_DE_CALCULO' as const : 'CALCULADO' as const, fuentes: ['R6'], motivo: valor === null ? 'No hay contratos que vencen en el período.' : null, ...(clave === 'conversion_porcentaje' ? { base: { numerador: 1, denominador: 2 } } : {}) }))
const board = {
  desde: '2026-09-01T06:00:00.000Z', hasta: '2026-10-01T06:00:00.000Z', corteEvaluacion: '2026-10-01T06:00:00.000Z', zonaHoraria: 'America/Managua' as const,
  cobertura: { estado: 'PARCIAL' as const, desde: '2026-08-01T06:00:00.000Z', hastaVerificada: '2026-10-01T06:00:00.000Z', observaciones: ['Registro parcial'] }, metricas: metrics, registrosSinAsignar: 0,
  desgloses: [
    { tipo: 'COTIZACION' as const, id: 10, clienteId: 3, referencia: 'COT-10', fecha: '2026-09-10T12:00:00.000Z', estado: 'ENVIADA' },
    { tipo: 'VENTA' as const, id: 11, clienteId: 3, referencia: 'VEN-11', fecha: '2026-09-12T12:00:00.000Z', total: '1200.00' },
    { tipo: 'CONTRATO' as const, id: 12, clienteId: 3, referencia: 'CON-12', fecha: '2026-09-15T12:00:00.000Z', total: '300.00', estado: 'ACTIVO' },
  ],
}

describe('H5 pages', () => {
  beforeEach(() => apiMock.mockReset())
  afterEach(cleanup)
  it('muestra las nueve métricas, denominador, tasa sin base y referencias enlazadas', async () => {
    apiMock.mockResolvedValue(board)
    render(<IndicadoresComercialesPage />)
    expect(await screen.findByText('Indicadores H.5')).toBeTruthy()
    for (const label of ['Cotizaciones', 'Conversión', 'Ventas', 'Importe de ventas', 'Clientes con ventas', 'Ticket promedio', 'Contratos activos', 'Renovaciones', 'Tasa de renovación']) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 de 2').length).toBeGreaterThan(0)
    const initialRequest = new URL(String(apiMock.mock.calls[0]?.[0]), 'http://localhost')
    for (const name of ['desde', 'hasta']) {
      expect(initialRequest.searchParams.get(name)).toMatch(/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
    }
    expect(screen.getAllByText('Sin base').length).toBeGreaterThan(0)
    expect((screen.getByRole('link', { name: 'COT-10' }) as HTMLAnchorElement).getAttribute('href')).toContain('cotizacionId=10')
    expect((screen.getByRole('link', { name: 'CON-12' }) as HTMLAnchorElement).getAttribute('href')).toContain('contratoId=12')
  })
  it('mantiene el formulario de contrato ante 409 y bloquea doble envío', async () => {
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/contratos?')) return { items: [], pagina: 1, limite: 25, hayMas: false } as never
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/contratos' && init?.method === 'POST') return new Promise((_, reject) => { rejectPost = reject })
      return [] as never
    })
    let rejectPost: ((reason: unknown) => void) | undefined
    render(<ContratosFuentesPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo contrato' }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CON-409' } })
    fireEvent.change(screen.getByLabelText('Inicio'), { target: { value: '2026-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2027-10-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '250.00' } })
    const save = screen.getByRole('button', { name: 'Guardar contrato' })
    fireEvent.click(save); fireEvent.click(save)
    await waitFor(() => expect(apiMock.mock.calls.filter(([url, init]) => url === '/api/fuentes-gerenciales/contratos' && init?.method === 'POST')).toHaveLength(1))
    expect(save.hasAttribute('disabled')).toBe(true)
    rejectPost?.(new ApiError('El contrato cambió. Vuelve a cargar.', 409))
    await waitFor(() => expect(screen.getAllByRole('alert').some(node => node.textContent?.includes('El contrato cambió'))).toBe(true))
    expect((screen.getByLabelText('Referencia') as HTMLInputElement).value).toBe('CON-409')
  })
  it('renueva desde el vencimiento del contrato y mantiene el vínculo al anterior', async () => {
    const contract = { id: 12, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'CON-12', inicio: '2026-01-01T06:00:00.000Z', fin: '2027-01-01T06:00:00.000Z', importe: '300.00', anteriorId: null, siguienteId: null, terminadoEn: null, registradoEn: '2026-01-01T06:00:00.000Z', observacion: null, version: 3 }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/contratos/12') return contract as never
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/contratos/12/renovar' && init?.method === 'POST') return { ...contract, id: 13, referencia: 'CON-13', anteriorId: 12 } as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/contratos?')) return { items: [contract], pagina: 1, limite: 25, hayMas: false } as never
      return [] as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/contratos?contratoId=12')
    try {
      render(<ContratosFuentesPage />)
      expect(await screen.findByRole('heading', { name: 'CON-12 · Ana Ruiz' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Renovar contrato' }))
      fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'CON-13' } })
      fireEvent.change(screen.getByLabelText('Fin'), { target: { value: '2028-01-01T10:00' } })
      fireEvent.change(screen.getByLabelText('Importe (NIO)'), { target: { value: '350.00' } })
      fireEvent.click(screen.getByRole('button', { name: 'Registrar renovación' }))
      await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/contratos/12/renovar', expect.objectContaining({ method: 'POST' })))
      const body = JSON.parse(String(apiMock.mock.calls.find(([url]) => url === '/api/fuentes-gerenciales/contratos/12/renovar')?.[1]?.body))
      expect(body).toMatchObject({ version: 3, referencia: 'CON-13', importe: '350.00' })
      expect(body.inicio).toBe(contract.fin)
    } finally { window.history.replaceState({}, '', previous) }
  })
  it('termina un contrato dentro de su vigencia y conserva el motivo', async () => {
    const contract = { id: 12, clienteId: 4, clienteNombre: 'Ana Ruiz', referencia: 'CON-12', inicio: '2025-01-01T06:00:00.000Z', fin: '2027-01-01T06:00:00.000Z', importe: '300.00', anteriorId: null, siguienteId: null, terminadoEn: null, registradoEn: '2025-01-01T06:00:00.000Z', observacion: null, version: 3 }
    apiMock.mockImplementation(async (url, init) => {
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/contratos/12') return contract as never
      if (typeof url === 'string' && url === '/api/fuentes-gerenciales/contratos/12/terminar' && init?.method === 'POST') return { ...contract, terminadoEn: '2026-10-20T16:00:00.000Z' } as never
      if (typeof url === 'string' && url.startsWith('/api/fuentes-gerenciales/contratos?')) return { items: [], pagina: 1, limite: 25, hayMas: false } as never
      return [] as never
    })
    const previous = window.location.pathname + window.location.search
    window.history.replaceState({}, '', '/inteligencia/origen/contratos?contratoId=12')
    try {
      render(<ContratosFuentesPage />)
      expect(await screen.findByRole('heading', { name: 'CON-12 · Ana Ruiz' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Terminar contrato' }))
      fireEvent.change(screen.getByLabelText('Fecha de terminación'), { target: { value: '2026-10-20T10:00' } })
      fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Servicio concluido' } })
      fireEvent.click(screen.getAllByRole('button', { name: 'Terminar contrato' }).at(-1)!)
      await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/fuentes-gerenciales/contratos/12/terminar', expect.objectContaining({ method: 'POST' })))
      const body = JSON.parse(String(apiMock.mock.calls.find(([url]) => url === '/api/fuentes-gerenciales/contratos/12/terminar')?.[1]?.body))
      expect(body).toMatchObject({ version: 3, motivo: 'Servicio concluido' })
    } finally { window.history.replaceState({}, '', previous) }
  })
})
