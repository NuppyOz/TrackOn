import type { ReactNode } from 'react';
import { seccionesComerciales, type SeccionComercial } from './contracts';
import './ComercialModule.css';

export type ComercialModuleProps = {
  section: SeccionComercial;
  children?: ReactNode;
  availableSections?: SeccionComercial[];
  onNavigate?: (section: SeccionComercial) => void;
  showHeading?: boolean;
};

export function ComercialModule({ section, children, availableSections = [section], onNavigate, showHeading = true }: ComercialModuleProps) {
  const active = seccionesComerciales.find(item => item.id === section);
  const available = seccionesComerciales.filter(item => availableSections.includes(item.id));
  return <div className={`comercial-scope comercial-module${children ? ' comercial-module--content' : ''}`} aria-labelledby={showHeading ? 'comercial-title' : undefined}>
    {showHeading && <header className="comercial-module__header"><p className="comercial-module__eyebrow">TrackOn · Comercial</p><h1 id="comercial-title">{active?.label ?? 'Comercial'}</h1></header>}
    {onNavigate && available.length > 1 && <nav className="comercial-module__nav" aria-label="Secciones comerciales">
      {available.map(item => <button key={item.id} type="button" aria-current={item.id === section ? 'page' : undefined} onClick={() => item.id !== section && onNavigate?.(item.id)}>{item.label}</button>)}
    </nav>}
    <section className="comercial-module__content" aria-live="polite">{children ?? <p>Esta sección se está implementando. Aquí aparecerán únicamente datos confirmados por el servicio comercial.</p>}</section>
  </div>;
}
