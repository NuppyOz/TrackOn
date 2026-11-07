import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import './styles/acciones.css'

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

/** Acción de fila al estilo SMSC: un icono por acción, con el nombre como tooltip y etiqueta accesible. */
export function IconButton({ icon: Icono, label, variant = 'primary', className = '', ...rest }: Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { icon: Icon; label: string; variant?: 'primary' | 'secondary' | 'danger' }>) {
  return <button type="button" aria-label={label} title={label} className={`tk-icon-button${variant === 'primary' ? '' : ` tk-icon-button--${variant}`} ${className}`.trim()} {...rest}>
    <Icono size={16} weight="bold" aria-hidden="true" />
  </button>
}

export function AccionesFila({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="tk-acciones-fila">{children}</div>
}
