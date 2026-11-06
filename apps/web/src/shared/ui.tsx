import type { ButtonHTMLAttributes, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, paginasVisibles, paginasVisiblesSinTotal } from './pagination'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export function Button({ variant = 'secondary', loading, className = '', children, disabled, ...props }: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }>) {
  return <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={`button button--${variant} ${className}`}>{loading ? 'Guardando…' : children}</button>
}

export function ButtonGroup({ children, className = '', align = 'end', ...props }: Readonly<HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }>) {
  return <div {...props} className={`button-group button-group--${align} ${className}`}>{children}</div>
}

export function RowActions({ children, label, className = '' }: Readonly<{ children: ReactNode; label: string; className?: string }>) {
  return <div className={`row-actions ${className}`} role="group" aria-label={label}>{children}</div>
}

export function FormField({ label, hint, error, required, className = '', children, ...props }: Readonly<LabelHTMLAttributes<HTMLLabelElement> & {
  label: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean; children: ReactNode;
}>) {
  return <label {...props} className={`form-field ${error ? 'form-field--error' : ''} ${className}`}>
    <span className="form-field__label">{label}{required && <span aria-hidden="true"> *</span>}</span>
    {children}
    {error ? <span className="form-field__message" role="alert">{error}</span> : hint && <span className="form-field__hint">{hint}</span>}
  </label>
}

export function PageHeader({ eyebrow, title, description, action }: Readonly<{ eyebrow?: string; title: string; description?: string; action?: ReactNode }>) {
  return <header className="page-header"><div><p className="breadcrumb">Operaciones / {eyebrow ?? title}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-header__action">{action}</div>}</header>
}

export function StatusBadge({ active, label }: Readonly<{ active: boolean; label?: string }>) {
  return <span className={`status-badge ${active ? 'status-badge--success' : 'status-badge--neutral'}`}><span className="status-badge__dot" aria-hidden="true" />{label ?? (active ? 'Activo' : 'Inactivo')}</span>
}

export function StatePanel({ type, title, description, action }: Readonly<{ type: 'loading' | 'empty' | 'error'; title: string; description?: string; action?: ReactNode }>) {
  return <div className={`state-panel state-panel--${type}`} role={type === 'error' ? 'alert' : undefined}><strong>{title}</strong>{description && <span>{description}</span>}{action}</div>
}

export function ActionMenu({ children, label = 'Más acciones' }: Readonly<{ children: ReactNode; label?: string }>) {
  return <details className="action-menu"><summary aria-label={label} title={label}><MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.9} /></summary><div className="action-menu__content">{children}</div></details>
}

export function DataTable({ children, className = '', label }: Readonly<{ children: ReactNode; className?: string; label?: string }>) {
  return <div className="table-wrap shared-table-wrap" role="region" aria-label={label ? `Tabla: ${label}` : 'Tabla desplazable'} tabIndex={0}><table className={`shared-table ${className}`} aria-label={label}>{children}</table></div>
}

export function TablePagination({ pagina, hayMas, cargando = false, limite = DEFAULT_PAGE_SIZE, cantidad, total, etiqueta = 'registros', onPagina, onLimite }: Readonly<{
  pagina: number; hayMas: boolean; cargando?: boolean; limite?: number;
  cantidad?: number; total?: number; etiqueta?: string;
  onPagina: (pagina: number) => void; onLimite?: (limite: number) => void;
}>) {
  const totalPaginas = total === undefined ? undefined : Math.max(1, Math.ceil(total / limite))
  const inicio = total === undefined || total === 0 ? 0 : (pagina - 1) * limite + 1
  const fin = total === undefined || total === 0 ? 0 : Math.min(total, inicio + (cantidad ?? limite) - 1)
  const resumen = total === undefined
    ? (cantidad !== undefined ? `${cantidad} ${etiqueta}` : etiqueta)
    : `${inicio}–${fin} de ${total} ${etiqueta}`
  const paginas = totalPaginas ? paginasVisibles(pagina, totalPaginas) : paginasVisiblesSinTotal(pagina, hayMas)
  return <nav className="shared-pagination" aria-label={`Paginación de ${etiqueta}`}>
    <div className="shared-pagination__summary" aria-live="polite"><strong>{resumen}</strong>{total === undefined && cantidad !== undefined && <span>en esta página</span>}</div>
    {onLimite && <label className="shared-pagination__size">Mostrar<select aria-label="Filas por página" value={limite} disabled={cargando} onChange={event => onLimite(Number(event.target.value))}>
      {[10, 25, 50, 100].map(valor => <option key={valor} value={valor}>{valor}</option>)}
    </select><span>por página</span></label>}
    <div className="shared-pagination__actions"><Button aria-label="Anterior" disabled={cargando || pagina === 1} onClick={() => onPagina(pagina - 1)}><ArrowLeft aria-hidden="true" size={16} /><span className="shared-pagination__nav-label">Anterior</span></Button>
      <span className="shared-pagination__pages">{paginas.map(item => typeof item === 'number'
        ? item === pagina
          ? <span key={item} className="shared-pagination__current" aria-current="page" aria-label={`Página actual, ${pagina}`}>{item}</span>
          : <button key={item} type="button" className="shared-pagination__page" aria-label={`Ir a la página ${item}`} disabled={cargando} onClick={() => onPagina(item)}>{item}</button>
        : <span key={item} className="shared-pagination__ellipsis" aria-hidden="true">…</span>)}</span>
      <Button aria-label="Siguiente" disabled={cargando || (totalPaginas !== undefined ? pagina >= totalPaginas : !hayMas)} onClick={() => onPagina(pagina + 1)}><span className="shared-pagination__nav-label">Siguiente</span><ArrowRight aria-hidden="true" size={16} /></Button></div>
  </nav>
}
