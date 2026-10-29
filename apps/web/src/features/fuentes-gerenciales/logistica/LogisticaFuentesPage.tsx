import { useState } from 'react';
import { ArticulosPage } from './articulos/ArticulosPage';
import { MovimientosPage } from './movimientos/MovimientosPage';
import { ComprasGerencialesPage } from './compras';
import { HerramientasGerencialesPage } from './herramientas';

export function LogisticaFuentesPage() {
    const [seccion, setSeccion] = useState<'articulos' | 'movimientos' | 'compras' | 'herramientas'>(() => {
        const query = new URLSearchParams(window.location.search);
        return query.has('movimientoId') ? 'movimientos' : query.has('compraId') ? 'compras' : query.has('herramientaId') ? 'herramientas' : 'articulos';
    });
    const [busy, setBusy] = useState(false);
    return <div className="fuentes-scope">
        <nav className="inteligencia-workspace__nav" aria-label="Registros logísticos">
            <button type="button" disabled={busy} aria-current={seccion === 'articulos' ? 'page' : undefined} onClick={() => setSeccion('articulos')}>Artículos</button>
            <button type="button" disabled={busy} aria-current={seccion === 'movimientos' ? 'page' : undefined} onClick={() => setSeccion('movimientos')}>Movimientos</button>
            <button type="button" disabled={busy} aria-current={seccion === 'compras' ? 'page' : undefined} onClick={() => setSeccion('compras')}>Compras</button>
            <button type="button" disabled={busy} aria-current={seccion === 'herramientas' ? 'page' : undefined} onClick={() => setSeccion('herramientas')}>Herramientas</button>
        </nav>
        {seccion === 'articulos' ? <ArticulosPage onBusyChange={setBusy} /> : seccion === 'movimientos' ? <MovimientosPage onBusyChange={setBusy} /> : seccion === 'compras' ? <ComprasGerencialesPage onBusyChange={setBusy} /> : <HerramientasGerencialesPage onBusyChange={setBusy} />}
    </div>;
}
