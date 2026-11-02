import { useState } from 'react';
import { ArticulosPage } from './articulos/ArticulosPage';
import { MovimientosPage } from './movimientos/MovimientosPage';
import { ComprasGerencialesPage } from './compras';
import { HerramientasGerencialesPage } from './herramientas';

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
        <nav className="inteligencia-workspace__nav" aria-label="Registros logísticos">
            <button type="button" disabled={busy} aria-current={seccion === 'articulos' ? 'page' : undefined} onClick={() => setSeccion('articulos')}>Artículos</button>
            <button type="button" disabled={busy} aria-current={seccion === 'movimientos' ? 'page' : undefined} onClick={() => setSeccion('movimientos')}>Movimientos</button>
            <button type="button" disabled={busy} aria-current={seccion === 'compras' ? 'page' : undefined} onClick={() => setSeccion('compras')}>Compras</button>
            <button type="button" disabled={busy} aria-current={seccion === 'herramientas' ? 'page' : undefined} onClick={() => setSeccion('herramientas')}>Herramientas</button>
        </nav>
        {contenido(seccion, setBusy)}
    </div>;
}
