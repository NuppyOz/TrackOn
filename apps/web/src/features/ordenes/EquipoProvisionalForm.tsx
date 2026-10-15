import { useId, useState, type SyntheticEvent } from 'react';
import { api } from '../../shared/api';
import { Button } from '../../shared/ui';
import type { RegistroEquipoOrden } from './ordenes.equipos.types';

const campos = [
    { dato: 'marcaRegistrada', motivo: 'motivoMarcaNoVisible', nombre: 'Marca' },
    { dato: 'modeloRegistrado', motivo: 'motivoModeloNoVisible', nombre: 'Modelo' },
    { dato: 'serieRegistrada', motivo: 'motivoSerieNoVisible', nombre: 'Número de serie' },
] as const;
const vacio = { descripcionProvisional: '', tipoRegistrado: '', marcaRegistrada: '', modeloRegistrado: '', serieRegistrada: '', motivoMarcaNoVisible: '', motivoModeloNoVisible: '', motivoSerieNoVisible: '' };

export default function EquipoProvisionalForm({ ordenId, onSaved, onCancel }: Readonly<{ ordenId: number; onSaved: (registro: RegistroEquipoOrden) => void; onCancel: () => void }>) {
    const id = useId();
    const [datos, setDatos] = useState(vacio);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function guardar(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault(); if (guardando) return;
        setGuardando(true); setError(null);
        try {
            const registro = await api<RegistroEquipoOrden>(`/api/ordenes/${ordenId}/equipos-provisionales`, { method: 'POST', body: JSON.stringify({
                ...datos, ...Object.fromEntries(campos.flatMap(campo => [[campo.dato, datos[campo.dato].trim() || null], [campo.motivo, datos[campo.dato].trim() ? null : datos[campo.motivo].trim() || null]])),
            }) });
            onSaved(registro);
        } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo identificar el equipo.'); }
        finally { setGuardando(false); }
    }
    return <form className="tk-work-form" onSubmit={event => void guardar(event)}><h4>Identificación provisional</h4><p>Este registro documenta la intervención. El equipo deberá registrarse después en el inventario.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <label htmlFor={`${id}-descripcion`}>Descripción e identificación del equipo *</label><textarea id={`${id}-descripcion`} rows={3} required minLength={10} maxLength={2000} value={datos.descripcionProvisional} onChange={event => setDatos({ ...datos, descripcionProvisional: event.target.value })} />
        <label htmlFor={`${id}-tipo`}>Tipo de equipo *</label><input id={`${id}-tipo`} required maxLength={100} value={datos.tipoRegistrado} onChange={event => setDatos({ ...datos, tipoRegistrado: event.target.value })} />
        {campos.map(campo => <div key={campo.dato}><label htmlFor={`${id}-${campo.dato}`}>{campo.nombre}</label><input id={`${id}-${campo.dato}`} maxLength={campo.dato === 'serieRegistrada' ? 150 : 100} value={datos[campo.dato]} onChange={event => setDatos({ ...datos, [campo.dato]: event.target.value })} />
            {!datos[campo.dato].trim() && <><label htmlFor={`${id}-${campo.motivo}`}>¿Por qué no es visible {campo.nombre.toLowerCase()}? *</label><input id={`${id}-${campo.motivo}`} required minLength={5} maxLength={1000} value={datos[campo.motivo]} onChange={event => setDatos({ ...datos, [campo.motivo]: event.target.value })} /></>}
        </div>)}
        <div className="tk-form-actions"><Button type="button" disabled={guardando} onClick={onCancel}>Cancelar</Button><Button type="submit" variant="primary" loading={guardando}>Guardar identificación provisional</Button></div>
    </form>;
}
