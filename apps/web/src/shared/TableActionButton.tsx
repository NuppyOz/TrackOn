import type { ButtonHTMLAttributes } from 'react';
import { Eye, Pencil, Power, PowerOff } from 'lucide-react';

type TableActionKind = 'view' | 'edit' | 'activate' | 'deactivate';

/** Mismo patrón visual de acciones compactas de Órdenes, reutilizable en catálogos. */
export default function TableActionButton({ action, children, className = '', type = 'button', ...props }:
    Readonly<ButtonHTMLAttributes<HTMLButtonElement> & { action: TableActionKind }>) {
    const Icon = {
        view: Eye,
        edit: Pencil,
        activate: Power,
        deactivate: PowerOff,
    }[action];

    return <button {...props} type={type} className={`tk-table-icon-action tk-table-icon-action--${action} ${className}`}>
        <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
        <span>{children}</span>
    </button>;
}
