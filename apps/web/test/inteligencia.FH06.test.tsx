import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IndicadoresFinancierosPage } from '../src/features/inteligencia/financiero'

const { consultar } = vi.hoisted(() => ({ consultar: vi.fn() }))
vi.mock('../src/features/inteligencia/financiero/financiero.api', () => ({ consultarTableroFinanciero: consultar }))

const keys = ['facturacion', 'cobros', 'cuentas_por_cobrar', 'cuentas_vencidas', 'costos', 'resultado_registrado', 'margen_porcentaje']
const tablero = {
  desde: '2026-01-01T06:00:00.000Z', hasta: '2026-02-01T06:00:00.000Z', corteEvaluacion: '2026-02-01T06:00:00.000Z', zonaHoraria: 'America/Managua',
  cobertura: { estado: 'PARCIAL', desde: null, hastaVerificada: null, observaciones: ['Datos capturados parcialmente'] }, registrosSinAsignar: 1,
  metricas: keys.map((clave, index) => ({ clave, valor: index === 6 ? '12.50' : '100.00', unidad: index === 6 ? 'porcentaje' : 'NIO', estado: 'CALCULADO', fuentes: ['comprobantes_gerenciales'], motivo: null, ...(index === 6 ? { base: { numerador: '10.00', denominador: '80.00' } } : {}) })),
  desgloses: [
    { tipo: 'COMPROBANTE', id: 42, referencia: 'FAC-042', clienteId: 7, clienteNombre: 'Cliente Uno', fecha: '2026-01-20T12:00:00.000Z', venceEn: null, importe: '80.00', saldo: '30.00', anuladaEn: null, netoPeriodo: '80.00' },
    { tipo: 'FACTURABLE', id: 8, referencia: 'SRV-008', clienteId: 7, clienteNombre: 'Cliente Uno', conceptoId: 3, conceptoNombre: 'Revisión', unidad: 'hora', fecha: '2026-01-18T12:00:00.000Z', cantidad: '3.000', pendiente: '2.000' },
    { tipo: 'RENTABILIDAD', agrupacion: 'CLIENTE', id: 7, referencia: 'Cliente Uno', ingresos: '80.00', costos: '70.00', resultado: '10.00', margen: '12.50' },
    { tipo: 'RENTABILIDAD', agrupacion: 'ORDEN', id: 11, referencia: 'OT-011', ingresos: '80.00', costos: '70.00', resultado: '10.00', margen: '12.50' },
  ],
}

describe('Indicadores financieros FH06', () => {
  afterEach(() => { cleanup(); consultar.mockReset() })
  it('expone las siete métricas, base del margen, servicios y enlaces trazables sin mezclar rentabilidad', async () => {
    consultar.mockResolvedValue(tablero)
    render(<IndicadoresFinancierosPage />)
    await waitFor(() => expect(screen.getByText('FAC-042')).toBeTruthy())
    for (const label of ['Facturación', 'Cobros', 'Cuentas por cobrar', 'Cuentas vencidas', 'Costos', 'Resultado registrado', 'Margen']) expect(screen.getByRole('row', { name: new RegExp(label) })).toBeTruthy()
    expect(screen.getByText(/Base: resultado C\$ 10\.00 ÷ facturación C\$ 80\.00/)).toBeTruthy()
    expect(screen.getByText(/2\.000 hora pendientes/)).toBeTruthy()
    const link = screen.getByRole('link', { name: 'FAC-042' })
    expect(link.getAttribute('href')).toBe('/inteligencia/origen/finanzas?comprobanteId=42')
    expect(screen.getByText(/rentabilidad por cliente y por orden son vistas separadas/)).toBeTruthy()
    expect(screen.getByText(/1 costos sin asignación/)).toBeTruthy()
  })
})
