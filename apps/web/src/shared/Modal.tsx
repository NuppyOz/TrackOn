import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ titulo, descripcion, ocupado = false, className = '', onClose, children }: Readonly<{
    titulo: string; descripcion?: string; ocupado?: boolean; className?: string; onClose: () => void; children: ReactNode;
}>) {
    const ref = useRef<HTMLDialogElement>(null);
    const id = useId();
    useEffect(() => {
        const dialog = ref.current;
        const anterior = document.activeElement;
        if (!dialog) return;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        return () => {
            if (typeof dialog.close === 'function') dialog.close();
            if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
        };
    }, []);
    return <dialog ref={ref} className={`tk-modal tk-orders ${className}`} aria-labelledby={id} aria-describedby={descripcion ? `${id}-descripcion` : undefined}
        onCancel={event => { event.preventDefault(); if (!ocupado) onClose(); }}>
        <header className="tk-modal-heading"><div><h2 id={id}>{titulo}</h2>{descripcion && <p id={`${id}-descripcion`}>{descripcion}</p>}</div><button type="button" className="tk-icon-button" aria-label="Cerrar ventana" title="Cerrar" disabled={ocupado} onClick={onClose}><X aria-hidden="true" size={19} /></button></header>
        <div className="tk-modal-body">{children}</div>
    </dialog>;
}
