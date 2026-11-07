import type { ReactNode } from 'react';
import { seccionesComerciales, type SeccionComercial } from './contracts';
import './ComercialModule.css';

export type ComercialModuleProps = {
  section: SeccionComercial;
  children?: ReactNode;
  showHeading?: boolean;
};

export function ComercialModule({ section, children, showHeading = true }: ComercialModuleProps) {
  const active = seccionesComerciales.find(item => item.id === section);
  return <div className={`comercial-scope comercial-module${children ? ' comercial-module--content' : ''}`} aria-labelledby={showHeading ? 'comercial-title' : undefined}>
    {showHeading && <header className="comercial-module__header"><p className="comercial-module__eyebrow">TrackOn · Comercial</p><h1 id="comercial-title">{active?.label ?? 'Comercial'}</h1></header>}
    <section className="comercial-module__content" aria-live="polite">{children ?? <p>Esta sección se está implementando. Aquí aparecerán únicamente datos confirmados por el servicio comercial.</p>}</section>
  </div>;
}
