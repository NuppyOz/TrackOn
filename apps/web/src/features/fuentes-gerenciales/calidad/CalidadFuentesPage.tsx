import { useState } from 'react';
import { GarantiasGerencialesPage } from './garantias';
import { CasosCalidadPage } from './casos';
import { CorrectivasGerencialesPage } from './correctivas';

export function CalidadFuentesPage() {
    const [seccion, setSeccion] = useState<'garantias' | 'casos' | 'correctivas'>(() => {
        const query = new URLSearchParams(window.location.search);
        return query.has('correctivaId') || query.get('tab') === 'correctivas' ? 'correctivas' : query.has('casoId') ? 'casos' : 'garantias';
    });
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <nav className="inteligencia-workspace__nav" aria-label="Registros de calidad">
            <button type="button" disabled={busy} aria-current={seccion === 'garantias' ? 'page' : undefined} onClick={() => setSeccion('garantias')}>Garantías</button>
            <button type="button" disabled={busy} aria-current={seccion === 'casos' ? 'page' : undefined} onClick={() => setSeccion('casos')}>Reclamos y calidad</button>
            <button type="button" disabled={busy} aria-current={seccion === 'correctivas' ? 'page' : undefined} onClick={() => setSeccion('correctivas')}>Acciones correctivas</button>
        </nav>
        {seccion === 'garantias' ? <GarantiasGerencialesPage onBusyChange={setBusy} /> : seccion === 'casos' ? <CasosCalidadPage onBusyChange={setBusy} /> : <CorrectivasGerencialesPage onBusyChange={setBusy} />}
    </div>;
}
