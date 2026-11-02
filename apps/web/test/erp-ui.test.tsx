import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataTable, MetricSummary, ModuleHeader, SemanticBadge } from '../src/features/erp-ui'

type Row = { id: number; name: string }
const columns = [
  { key: 'name', header: 'Nombre', sortable: true, render: (row: Row) => row.name },
  { key: 'id', header: 'Código', render: (row: Row) => row.id },
]
const row: Row = { id: 7, name: 'Cliente Norte' }
function tableProps(overrides: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return {
    columns,
    rows: [row],
    getRowKey: (item: Row) => item.id,
    search: { value: '', onChange: vi.fn() },
    sort: { key: 'name', direction: 'asc' as const, onChange: vi.fn() },
    pagination: { pagina: 1, limite: 25, hayMas: true, onPageChange: vi.fn() },
    ...overrides,
  }
}

describe('ERP UI primitives', () => {
  afterEach(cleanup)

  it('renders module heading, metrics, and a semantic badge', () => {
    render(<div className="comercial-scope"><ModuleHeader breadcrumb="Comercial / Clientes" title="Clientes" description="Relación comercial" /><MetricSummary metrics={[{ label: 'Activos', value: 4 }]} /><SemanticBadge label="Activo" variant="success" icon="✓" /></div>)
    expect(screen.getByRole('heading', { name: 'Clientes' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Ruta' }).textContent).toContain('Comercial / Clientes')
    expect(screen.getByRole('region', { name: 'Resumen' }).textContent).toContain('4')
    expect(screen.getByText('Activo').textContent).toBe('✓Activo')
  })

  it('emits external search, sort, and pagination changes without filtering supplied rows', () => {
    const props = tableProps()
    render(<div className="comercial-scope"><DataTable {...props} /></div>)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'inexistente' } })
    expect(props.search.onChange).toHaveBeenCalledWith('inexistente')
    expect(screen.getByText('Cliente Norte')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }))
    expect(props.sort.onChange).toHaveBeenCalledWith('name', 'desc')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(props.pagination.onPageChange).toHaveBeenCalledWith(2)
  })

  it('announces loading, error with retry, and empty search results', () => {
    const retry = vi.fn()
    const { rerender } = render(<div className="comercial-scope"><DataTable {...tableProps({ state: 'loading' })} /></div>)
    expect(screen.getByRole('status').textContent).toContain('Cargando')
    rerender(<div className="comercial-scope"><DataTable {...tableProps({ state: 'error', error: { title: 'Error de red' }, onRetry: retry })} /></div>)
    expect(screen.getByRole('alert').textContent).toContain('Error de red')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(retry).toHaveBeenCalledOnce()
    rerender(<div className="comercial-scope"><DataTable {...tableProps({ rows: [], search: { value: 'abc', onChange: vi.fn() } })} /></div>)
    expect(screen.getByRole('status').textContent).toContain('No hay resultados')
  })

  it('disables pagination using page boundary and backend hayMas', () => {
    const props = tableProps({ pagination: { pagina: 3, limite: 25, hayMas: false, onPageChange: vi.fn() } })
    render(<div className="comercial-scope"><DataTable {...props} /></div>)
    expect(screen.getByRole('button', { name: 'Anterior' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true)
  })
})
