import { useState } from 'react';
import { ArticulosPage } from './articulos/ArticulosPage';
import { MovimientosPage } from './movimientos/MovimientosPage';
import { ComprasGerencialesPage } from './compras';
import { HerramientasGerencialesPage } from './herramientas';
import { SectionSelector } from '../../erp-ui/components';

type SeccionLogistica = 'articulos' | 'movimientos' | 'compras' | 'herramientas';

function seccionInicial(): SeccionLogistica {
    const query = new URLSearchParams(window.location.search);
    if (query.has('movimientoId')) return 'movimientos';
    if (query.has('compraId')) return 'compras';
    if (query.has('herramientaId')) return 'herramientas';
    return 'articulos';
}

function contenido(seccion: SeccionLogistica, onBusyChange: (busy: boolean) => void) {
    if (seccion === 'articulos') return <ArticulosPage onBusyChange={onBusyChange} />;
    if (seccion === 'movimientos') return <MovimientosPage onBusyChange={onBusyChange} />;
    if (seccion === 'compras') return <ComprasGerencialesPage onBusyChange={onBusyChange} />;
    return <HerramientasGerencialesPage onBusyChange={onBusyChange} />;
}

export function LogisticaFuentesPage() {
    const [seccion, setSeccion] = useState<SeccionLogistica>(seccionInicial);
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <SectionSelector label="Tipo de registro" value={seccion} disabled={busy} onChange={value => setSeccion(value as SeccionLogistica)} options={[
            { value: 'articulos', label: 'Artículos' }, { value: 'movimientos', label: 'Movimientos' },
            { value: 'compras', label: 'Compras' }, { value: 'herramientas', label: 'Herramientas' },
        ]} />
        {contenido(seccion, setBusy)}
    </div>;
}
