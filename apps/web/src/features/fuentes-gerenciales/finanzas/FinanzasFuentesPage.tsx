import { useState } from 'react';
import { ComprobantesPage } from './documentos';
import { FacturablesPage } from './facturables';
import { CobrosPage } from './cobros';
import { CostosPage } from './costos';
import { SectionSelector } from '../../erp-ui/components';

export function FinanzasFuentesPage() {
    const [seccion, setSeccion] = useState<'comprobantes' | 'facturables' | 'cobros' | 'costos'>(() => {
        const query = new URLSearchParams(window.location.search);
        return query.has('facturableId') ? 'facturables' : query.has('cobroId') ? 'cobros' : query.has('costoId') ? 'costos' : 'comprobantes';
    });
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <SectionSelector label="Tipo de registro" value={seccion} disabled={busy} onChange={value => setSeccion(value as typeof seccion)} options={[
            { value: 'comprobantes', label: 'Comprobantes' }, { value: 'facturables', label: 'Servicios realizados' },
            { value: 'cobros', label: 'Cobros' }, { value: 'costos', label: 'Costos' },
        ]} />
        {seccion === 'comprobantes' ? <ComprobantesPage onBusyChange={setBusy} /> : seccion === 'facturables' ? <FacturablesPage onBusyChange={setBusy} /> : seccion === 'cobros' ? <CobrosPage onBusyChange={setBusy} /> : <CostosPage onBusyChange={setBusy} />}
    </div>;
}
