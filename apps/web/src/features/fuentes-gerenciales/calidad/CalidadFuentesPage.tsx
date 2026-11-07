import { useState } from 'react';
import { GarantiasGerencialesPage } from './garantias';
import { CasosCalidadPage } from './casos';
import { CorrectivasGerencialesPage } from './correctivas';
import { SectionSelector } from '../../erp-ui/components';

export function CalidadFuentesPage() {
    const [seccion, setSeccion] = useState<'garantias' | 'casos' | 'correctivas'>(() => {
        const query = new URLSearchParams(window.location.search);
        return query.has('correctivaId') || query.get('tab') === 'correctivas' ? 'correctivas' : query.has('casoId') ? 'casos' : 'garantias';
    });
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <SectionSelector label="Tipo de registro" value={seccion} disabled={busy} onChange={value => setSeccion(value as typeof seccion)} options={[
            { value: 'garantias', label: 'Garantías' }, { value: 'casos', label: 'Reclamos y calidad' },
            { value: 'correctivas', label: 'Acciones correctivas' },
        ]} />
        {seccion === 'garantias' ? <GarantiasGerencialesPage onBusyChange={setBusy} /> : seccion === 'casos' ? <CasosCalidadPage onBusyChange={setBusy} /> : <CorrectivasGerencialesPage onBusyChange={setBusy} />}
    </div>;
}
