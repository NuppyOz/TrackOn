import Modal from './Modal';
import { Button } from './ui';

interface ConfirmDialogProps {
    titulo: string;
    descripcion: string;
    etiquetaConfirmar?: string;
    procesando?: boolean;
    variante?: 'primary' | 'danger';
    onCancel: () => void;
    onConfirm: () => void;
}

export default function ConfirmDialog({
    titulo,
    descripcion,
    etiquetaConfirmar = 'Confirmar',
    procesando = false,
    variante = 'primary',
    onCancel,
    onConfirm,
}: Readonly<ConfirmDialogProps>) {
    return <Modal titulo={titulo} descripcion={descripcion} ocupado={procesando} className="tk-confirm-dialog" onClose={onCancel}>
        <div className="tk-form-actions">
            <Button type="button" disabled={procesando} onClick={onCancel}>Cancelar</Button>
            <Button type="button" variant={variante} disabled={procesando} onClick={onConfirm}>
                {procesando ? 'Procesando…' : etiquetaConfirmar}
            </Button>
        </div>
    </Modal>;
}
