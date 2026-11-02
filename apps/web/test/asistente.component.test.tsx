import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarDisponibilidadAsistente, solicitarInterpretacion } from '../src/features/inteligencia/asistente/asistente.api'
import { AsistenteIndicadores } from '../src/features/inteligencia/asistente'

vi.mock('../src/features/inteligencia/asistente/asistente.api', () => ({
  consultarDisponibilidadAsistente: vi.fn(),
  solicitarInterpretacion: vi.fn(),
}))
const availabilityMock = vi.mocked(consultarDisponibilidadAsistente)
const explainMock = vi.mocked(solicitarInterpretacion)
const generated = {
  texto: 'Lectura <script>alert(1)</script>\nSegunda línea.', snapshotId: 'abcdef1234567890', area: 'comercial' as const,
  desde: '2026-01-01T06:00:00.000Z', hasta: '2026-01-31T06:00:00.000Z', corte: '2026-01-31T06:00:00.000Z',
  fuentes: ['cotizaciones_comerciales', 'secret_code'], generadaEn: '2026-02-01T06:00:00.000Z',
}
const props = { area: 'comercial' as const, desde: generated.desde, hasta: generated.hasta }

describe('asistente de indicadores', () => {
  beforeEach(() => { availabilityMock.mockReset(); explainMock.mockReset() })
  afterEach(cleanup)

  it('comprueba disponibilidad y espera el clic explícito; presenta texto como texto y fuentes legibles', async () => {
    availabilityMock.mockResolvedValue({ disponible: true })
    explainMock.mockResolvedValue(generated)
    render(<AsistenteIndicadores {...props} />)
    await waitFor(() => expect(availabilityMock).toHaveBeenCalledTimes(1))
    expect(explainMock).not.toHaveBeenCalled()
    const button = await screen.findByRole('button', { name: 'Explicar indicadores' })
    fireEvent.click(button)
    expect(await screen.findByText('Interpretación generada')).toBeTruthy()
    expect(explainMock).toHaveBeenCalledWith('comercial', props.desde, props.hasta, expect.any(AbortSignal))
    const article = screen.getByRole('article', { name: 'Interpretación generada' })
    expect(article.textContent).toContain('Lectura <script>alert(1)</script>')
    expect(article.querySelector('script')).toBeNull()
    expect(article.textContent).toContain('Cotizaciones, Fuente de indicadores')
    expect(article.textContent).toContain('abcdef123456')
  })

  it('muestra configuración ausente sin pedir interpretación', async () => {
    availabilityMock.mockResolvedValue({ disponible: false })
    render(<AsistenteIndicadores {...props} />)
    expect(await screen.findByText('El asistente no está configurado.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Explicar indicadores' }).hasAttribute('disabled')).toBe(true)
    expect(explainMock).not.toHaveBeenCalled()
  })

  it('permite reintentar un error y descarta resultados obsoletos tras cambiar el rango', async () => {
    availabilityMock.mockResolvedValue({ disponible: true })
    explainMock.mockRejectedValueOnce(new Error('Error temporal'))
    let resolveOld!: (value: typeof generated) => void
    explainMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const view = render(<AsistenteIndicadores {...props} />)
    const button = await screen.findByRole('button', { name: 'Explicar indicadores' })
    fireEvent.click(button)
    expect(await screen.findByText('Error temporal')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(explainMock).toHaveBeenCalledTimes(2))
    view.rerender(<AsistenteIndicadores {...props} hasta="2026-02-01T06:00:00.000Z" />)
    await waitFor(() => expect(availabilityMock).toHaveBeenCalledTimes(2))
    resolveOld({ ...generated, texto: 'Resultado anterior' })
    await waitFor(() => expect(screen.queryByText('Resultado anterior')).toBeNull())
    expect(screen.queryByText('Error temporal')).toBeNull()
  })
})
