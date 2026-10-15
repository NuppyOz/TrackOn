interface Props {
    titulo: string;
    descripcion: string;
    ocupada: boolean;
    onCancelar: () => void;
    onConfirmar: () => void;
}

export default function ConfirmarAccionEmpleado({ titulo, descripcion, ocupada, onCancelar, onConfirmar }: Readonly<Props>) {
    return <div className="tk-employee-modal-overlay" role="presentation">
        <div role="alertdialog" aria-modal="true" aria-labelledby="empleado-confirmar-titulo" aria-describedby="empleado-confirmar-descripcion" className="tk-employee-modal">
            <h3 id="empleado-confirmar-titulo">{titulo}</h3>
            <p id="empleado-confirmar-descripcion">{descripcion}</p>
            <div className="tk-employee-form-actions">
                <button type="button" className="tk-employee-secondary" disabled={ocupada} onClick={onCancelar}>Cancelar</button>
                <button type="button" className="tk-employee-primary" disabled={ocupada} onClick={onConfirmar}>{ocupada ? 'Procesando…' : 'Confirmar'}</button>
            </div>
        </div>
    </div>;
}
