import { useState } from 'react';
import { ComprobantesPage } from './documentos';
import { FacturablesPage } from './facturables';
import { CobrosPage } from './cobros';
import { CostosPage } from './costos';

export function FinanzasFuentesPage() {
    const [seccion, setSeccion] = useState<'comprobantes' | 'facturables' | 'cobros' | 'costos'>(() => {
        const query = new URLSearchParams(window.location.search);
        return query.has('facturableId') ? 'facturables' : query.has('cobroId') ? 'cobros' : query.has('costoId') ? 'costos' : 'comprobantes';
    });
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <nav className="inteligencia-workspace__nav" aria-label="Registros financieros">
            <button type="button" disabled={busy} aria-current={seccion === 'comprobantes' ? 'page' : undefined} onClick={() => setSeccion('comprobantes')}>Comprobantes</button>
            <button type="button" disabled={busy} aria-current={seccion === 'facturables' ? 'page' : undefined} onClick={() => setSeccion('facturables')}>Servicios realizados</button>
            <button type="button" disabled={busy} aria-current={seccion === 'cobros' ? 'page' : undefined} onClick={() => setSeccion('cobros')}>Cobros</button>
            <button type="button" disabled={busy} aria-current={seccion === 'costos' ? 'page' : undefined} onClick={() => setSeccion('costos')}>Costos</button>
        </nav>
        {seccion === 'comprobantes' ? <ComprobantesPage onBusyChange={setBusy} /> : seccion === 'facturables' ? <FacturablesPage onBusyChange={setBusy} /> : seccion === 'cobros' ? <CobrosPage onBusyChange={setBusy} /> : <CostosPage onBusyChange={setBusy} />}
    </div>;
}
