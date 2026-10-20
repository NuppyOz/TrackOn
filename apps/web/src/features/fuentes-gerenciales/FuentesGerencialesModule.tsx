import type { ReactNode } from 'react';
import { seccionesFuentesGerenciales, type SeccionFuenteGerencial } from './contracts';
import './FuentesGerencialesModule.css';

export type FuentesGerencialesModuleProps = {
  section: SeccionFuenteGerencial;
  children?: ReactNode;
  availableSections?: SeccionFuenteGerencial[];
  onNavigate?: (section: SeccionFuenteGerencial) => void;
};

export function FuentesGerencialesModule({ section, children, availableSections = [section], onNavigate }: FuentesGerencialesModuleProps) {
  const active = seccionesFuentesGerenciales.find(item => item.id === section);
  const available = seccionesFuentesGerenciales.filter(item => availableSections.includes(item.id));
  return <div className="fuentes-scope fuentes-gerenciales-module" aria-labelledby="fuentes-gerenciales-title">
    <header className="fuentes-gerenciales-module__header"><p className="fuentes-gerenciales-module__eyebrow">TrackOn · Registros de origen</p><h1 id="fuentes-gerenciales-title">{active?.label ?? 'Registros de origen'}</h1></header>
    {onNavigate && available.length > 1 && <nav className="fuentes-gerenciales-module__nav" aria-label="Registros de origen disponibles">
      {available.map(item => <button key={item.id} type="button" aria-current={item.id === section ? 'page' : undefined} onClick={() => item.id !== section && onNavigate?.(item.id)}>{item.label}</button>)}
    </nav>}
    <section className="fuentes-gerenciales-module__content" aria-live="polite">{children ?? <p>Los registros de origen de esta sección se están implementando.</p>}</section>
  </div>;
}
