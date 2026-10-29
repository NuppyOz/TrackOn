import type { ReactNode } from 'react'
import './tokens.css'
import './erp-ui.css'

export type ModuleHeaderProps = Readonly<{
  breadcrumb?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}>

export function ModuleHeader({ breadcrumb, title, description, action }: ModuleHeaderProps) {
  return (
    <header className="erp-ui__module-header">
      <div className="erp-ui__module-copy">
        {breadcrumb && <nav className="erp-ui__breadcrumb" aria-label="Ruta">{breadcrumb}</nav>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="erp-ui__module-action">{action}</div>}
    </header>
  )
}

export type Metric = Readonly<{ label: string; value: ReactNode; description?: string }>

export function MetricSummary({ metrics, label = 'Resumen' }: Readonly<{ metrics: readonly Metric[]; label?: string }>) {
  if (metrics.length > 4) throw new RangeError('MetricSummary admite hasta cuatro métricas')
  return (
    <section className="erp-ui__metrics" aria-label={label}>
      {metrics.map((metric) => (
        <article className="erp-ui__metric" key={metric.label}>
          <h2>{metric.label}</h2>
          <p className="erp-ui__metric-value">{metric.value}</p>
          {metric.description && <p className="erp-ui__metric-description">{metric.description}</p>}
        </article>
      ))}
    </section>
  )
}

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'
const badgeIcons: Record<BadgeVariant, string> = { neutral: '○', success: '✓', warning: '!', danger: '×', info: 'i' }
export function SemanticBadge({ label, variant, icon }: Readonly<{ label: string; variant: BadgeVariant; icon?: ReactNode }>) {
  return <span className={`erp-ui__badge erp-ui__badge--${variant}`}><span aria-hidden="true">{icon ?? badgeIcons[variant]}</span>{label}</span>
}

export type SortDirection = 'asc' | 'desc'
export type DataTableColumn<T> = Readonly<{
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
}>
export type DataTableProps<T> = Readonly<{
  columns: readonly DataTableColumn<T>[]
  rows: readonly T[]
  getRowKey: (row: T) => string | number
  search?: Readonly<{ value: string; onChange: (value: string) => void; placeholder?: string; label?: string }>
  sort?: Readonly<{ key: string; direction: SortDirection; onChange: (key: string, direction: SortDirection) => void }>
  pagination: Readonly<{ pagina: number; limite: number; hayMas: boolean; onPageChange: (pagina: number) => void; label?: string }>
  state?: 'ready' | 'loading' | 'error'
  error?: Readonly<{ title?: string; description?: string }>
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
}>

export function DataTable<T>({
  columns, rows, getRowKey, search, sort, pagination, state = 'ready', error, onRetry,
  emptyTitle, emptyDescription,
}: DataTableProps<T>) {
  const hasSearch = (search?.value.trim().length ?? 0) > 0
  const changeSort = (key: string) => sort?.onChange(key, sort.key === key && sort.direction === 'asc' ? 'desc' : 'asc')
  const paginationNav = (
    <nav className="erp-ui__pagination" aria-label={pagination.label ?? 'Paginación de resultados'}>
      <span aria-live="polite">Página {pagination.pagina} · {pagination.limite} por página</span>
      <div>
        <button type="button" className="erp-ui__button" onClick={() => pagination.onPageChange(pagination.pagina - 1)} disabled={pagination.pagina <= 1}>Anterior</button>
        <button type="button" className="erp-ui__button" onClick={() => pagination.onPageChange(pagination.pagina + 1)} disabled={!pagination.hayMas}>Siguiente</button>
      </div>
    </nav>
  )

  return (
    <section className="erp-ui__table-section" aria-label="Tabla de datos">
      {search && <label className="erp-ui__search">
        <span>{search.label ?? 'Buscar'}</span>
        <input type="search" value={search.value} placeholder={search.placeholder ?? 'Buscar registros'} onChange={(event) => search.onChange(event.currentTarget.value)} />
      </label>}

      {state === 'loading' ? (
        <div className="erp-ui__state" role="status" aria-live="polite"><span className="erp-ui__spinner" aria-hidden="true" /> Cargando registros…</div>
      ) : state === 'error' ? (
        <div className="erp-ui__state erp-ui__state--error" role="alert">
          <strong>{error?.title ?? 'No se pudieron cargar los registros'}</strong>
          {error?.description && <p>{error.description}</p>}
          {onRetry && <button className="erp-ui__button" type="button" onClick={onRetry}>Reintentar</button>}
        </div>
      ) : rows.length === 0 ? (
        <>
          <div className="erp-ui__state" role="status">
            <strong>{emptyTitle ?? (hasSearch ? 'No hay resultados' : 'Todavía no hay registros')}</strong>
            {(emptyDescription || hasSearch) && <p>{emptyDescription ?? 'Prueba con otro término de búsqueda.'}</p>}
          </div>
          {pagination.pagina > 1 && paginationNav}
        </>
      ) : (
        <>
          <div className="erp-ui__table-scroll" role="region" aria-label="Resultados" tabIndex={0}>
            <table className="erp-ui__table">
              <thead><tr>{columns.map((column) => (
                <th key={column.key} scope="col" className={`erp-ui__align--${column.align ?? 'start'}`} aria-sort={column.sortable && sort ? (sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
                  {column.sortable && sort ? <button type="button" className="erp-ui__sort" onClick={() => changeSort(column.key)}>{column.header}<span aria-hidden="true">{sort.key === column.key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span><span className="erp-ui__sr-only">{sort.key === column.key ? `, orden ${sort.direction === 'asc' ? 'ascendente' : 'descendente'}` : ', ordenar'}</span></button> : column.header}
                </th>
              ))}</tr></thead>
              <tbody>{rows.map((row) => <tr key={getRowKey(row)}>{columns.map((column) => <td key={column.key} className={`erp-ui__align--${column.align ?? 'start'}`}>{column.render(row)}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {paginationNav}
        </>
      )}
    </section>
  )
}

