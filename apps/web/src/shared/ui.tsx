import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Button({ variant = 'secondary', loading, className = '', children, disabled, ...props }: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }>) {
  return <button {...props} disabled={disabled || loading} className={`button button--${variant} ${className}`}>{loading ? 'Guardando…' : children}</button>
}

export function PageHeader({ eyebrow, title, description, action }: Readonly<{ eyebrow?: string; title: string; description?: string; action?: ReactNode }>) {
  return <header className="page-header"><div><p className="breadcrumb">Operaciones / {eyebrow ?? title}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-header__action">{action}</div>}</header>
}

export function StatusBadge({ active, label }: Readonly<{ active: boolean; label?: string }>) {
  return <span className={`status-badge ${active ? 'status-badge--success' : 'status-badge--neutral'}`}><span aria-hidden="true">●</span>{label ?? (active ? 'Activo' : 'Inactivo')}</span>
}

export function StatePanel({ type, title, description, action }: Readonly<{ type: 'loading' | 'empty' | 'error'; title: string; description?: string; action?: ReactNode }>) {
  return <div className={`state-panel state-panel--${type}`} role={type === 'error' ? 'alert' : undefined}><strong>{title}</strong>{description && <span>{description}</span>}{action}</div>
}

export function ActionMenu({ children, label = 'Más acciones' }: Readonly<{ children: ReactNode; label?: string }>) {
  return <details className="action-menu"><summary aria-label={label}>⋮</summary><div className="action-menu__content">{children}</div></details>
}

export function DataTable({ children, className = '', label }: Readonly<{ children: ReactNode; className?: string; label?: string }>) {
  return <div className="table-wrap shared-table-wrap"><table className={`shared-table ${className}`} aria-label={label}>{children}</table></div>
}

export function TablePagination({ pagina, hayMas, cargando = false, limite = 25, cantidad, etiqueta = 'registros', onPagina, onLimite }: Readonly<{
  pagina: number; hayMas: boolean; cargando?: boolean; limite?: number;
  cantidad?: number; etiqueta?: string;
  onPagina: (pagina: number) => void; onLimite?: (limite: number) => void;
}>) {
  return <nav className="shared-pagination" aria-label={`Paginación de ${etiqueta}`}>
    <div className="shared-pagination__summary" aria-live="polite"><strong>Página {pagina}</strong>{cantidad !== undefined && <span>{cantidad} {etiqueta} en esta página</span>}</div>
    {onLimite && <label className="shared-pagination__size">Mostrar<select aria-label="Filas por página" value={limite} disabled={cargando} onChange={event => onLimite(Number(event.target.value))}>
      {[10, 25, 50, 100].map(valor => <option key={valor} value={valor}>{valor}</option>)}
    </select><span>por página</span></label>}
    <div className="shared-pagination__actions"><Button aria-label="Anterior" disabled={cargando || pagina === 1} onClick={() => onPagina(pagina - 1)}>← Anterior</Button>
      <Button aria-label="Siguiente" disabled={cargando || !hayMas} onClick={() => onPagina(pagina + 1)}>Siguiente →</Button></div>
  </nav>
}
