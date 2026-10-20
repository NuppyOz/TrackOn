import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotasDocumentosPanel } from '../src/features/comercial/crm/NotasDocumentosPanel'

const api = vi.hoisted(() => ({
  listarNotas: vi.fn(), crearNota: vi.fn(), listarDocumentos: vi.fn(), crearDocumento: vi.fn(),
}))
vi.mock('../src/features/comercial/crm/crm.api', () => api)

const pagina = (items: unknown[] = []) => ({ items, pagina: 1, limite: 10, hayMas: false })
const nota = { id: 1, clienteId: 7, autorId: 3, texto: 'Llamar el lunes', creadaEn: '2026-10-20T12:00:00Z' }
const doc = { id: 2, clienteId: 7, autorId: 3, titulo: 'Contrato vigente', tipo: 'Contrato', url: 'https://example.test/contrato', nota: null, creadaEn: '2026-10-20T12:00:00Z' }

describe('NotasDocumentosPanel FE01', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listarNotas.mockResolvedValue(pagina([nota]))
    api.listarDocumentos.mockResolvedValue(pagina([doc]))
    api.crearNota.mockResolvedValue(nota)
    api.crearDocumento.mockResolvedValue(doc)
  })
  afterEach(cleanup)

  it('consulta y agrega una nota con formulario contextual', async () => {
    render(<NotasDocumentosPanel clienteId={7} activo seccion="notas" />)
    expect(await screen.findByText('Llamar el lunes')).toBeTruthy()
    expect(api.listarNotas).toHaveBeenCalledWith(7, expect.objectContaining({ pagina: 1, limite: 10, sortBy: 'creadaEn', sortDir: 'desc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Añadir nota' }))
    const form = screen.getByRole('form', { name: 'Añadir nota' })
    const notaField = form.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(notaField, { target: { value: '  Renovar en diciembre  ' } })
    fireEvent.submit(form)
    await waitFor(() => expect(api.crearNota).toHaveBeenCalledWith(7, { texto: 'Renovar en diciembre' }))
    expect((await screen.findByRole('status')).textContent).toContain('Nota guardada.')
  })

  it('valida límites y conserva el formulario ante error del servicio', async () => {
    api.crearNota.mockRejectedValueOnce(new Error('Servicio no disponible'))
    render(<NotasDocumentosPanel clienteId={7} activo seccion="notas" />)
    await screen.findByText('Llamar el lunes')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir nota' }))
    const form = screen.getByRole('form', { name: 'Añadir nota' })
    const field = form.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'nota'.repeat(501) } })
    fireEvent.submit(form)
    expect((await screen.findByRole('alert')).textContent).toContain('1 a 2000 caracteres')
    fireEvent.change(field, { target: { value: 'Nota válida' } })
    fireEvent.submit(form)
    expect((await screen.findByRole('alert')).textContent).toContain('Servicio no disponible')
    expect(field.value).toBe('Nota válida')
  })

  it('muestra referencias de documento con enlace seguro y exige HTTPS al crear', async () => {
    render(<NotasDocumentosPanel clienteId={7} activo seccion="documentos" />)
    expect(await screen.findByText('Contrato vigente')).toBeTruthy()
    const link = screen.getByRole('link', { name: /Abrir referencia/ })
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    fireEvent.click(screen.getByRole('button', { name: 'Añadir documento' }))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Ficha' } })
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'PDF' } })
    fireEvent.change(screen.getByLabelText('URL HTTPS (opcional)'), { target: { value: 'http://example.test' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Añadir documento' }))
    expect((await screen.findByRole('alert')).textContent).toContain('HTTPS')
    expect(api.crearDocumento).not.toHaveBeenCalled()
  })

  it('permite consultar clientes inactivos y oculta la escritura', async () => {
    render(<NotasDocumentosPanel clienteId={7} activo={false} seccion="notas" />)
    expect(await screen.findByText('Llamar el lunes')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('escritura deshabilitada')
    expect(screen.queryByRole('button', { name: 'Añadir nota' })).toBeNull()
    expect(screen.queryByRole('form')).toBeNull()
  })

  it('ignora resultados tardíos al cambiar el cliente', async () => {
    let resolveOld!: (value: ReturnType<typeof pagina>) => void
    api.listarNotas.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const view = render(<NotasDocumentosPanel clienteId={7} activo seccion="notas" />)
    await waitFor(() => expect(api.listarNotas).toHaveBeenCalledTimes(1))
    api.listarNotas.mockResolvedValueOnce(pagina([{ ...nota, clienteId: 8 }]))
    view.rerender(<NotasDocumentosPanel clienteId={8} activo seccion="notas" />)
    await waitFor(() => expect(api.listarNotas).toHaveBeenCalledTimes(2))
    await act(async () => { resolveOld(pagina([{ ...nota, texto: 'Respuesta vieja' }])) })
    expect(await screen.findByText('Llamar el lunes')).toBeTruthy()
    expect(screen.queryByText('Respuesta vieja')).toBeNull()
  })

  it('ignora resultados tardíos al cambiar de notas a documentos', async () => {
    let resolveOld!: (value: ReturnType<typeof pagina>) => void
    api.listarNotas.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const view = render(<NotasDocumentosPanel clienteId={7} activo seccion="notas" />)
    await waitFor(() => expect(api.listarNotas).toHaveBeenCalledTimes(1))
    view.rerender(<NotasDocumentosPanel clienteId={7} activo seccion="documentos" />)
    expect(await screen.findByText('Contrato vigente')).toBeTruthy()
    await act(async () => { resolveOld(pagina([{ ...nota, texto: 'Respuesta vieja' }])) })
    expect(screen.queryByText('Respuesta vieja')).toBeNull()
  })
})
