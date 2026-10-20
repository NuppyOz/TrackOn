import type { ReactNode } from 'react';
import { seccionesInteligencia, type SeccionInteligencia } from './contracts';
import './InteligenciaModule.css';

export type InteligenciaModuleProps = {
  section: SeccionInteligencia;
  children?: ReactNode;
  availableSections?: SeccionInteligencia[];
  onNavigate?: (section: SeccionInteligencia) => void;
};

export function InteligenciaModule({ section, children, availableSections = [section], onNavigate }: InteligenciaModuleProps) {
  const active = seccionesInteligencia.find(item => item.id === section);
  const available = seccionesInteligencia.filter(item => availableSections.includes(item.id));
  return <div className="inteligencia-scope inteligencia-module" aria-labelledby="inteligencia-title">
    <header className="inteligencia-module__header"><p className="inteligencia-module__eyebrow">TrackOn · Inteligencia</p><h1 id="inteligencia-title">{active?.label ?? 'Inteligencia'}</h1></header>
    {onNavigate && available.length > 1 && <nav className="inteligencia-module__nav" aria-label="Tableros disponibles">
      {available.map(item => <button key={item.id} type="button" aria-current={item.id === section ? 'page' : undefined} onClick={() => item.id !== section && onNavigate?.(item.id)}>{item.label}</button>)}
    </nav>}
    <section className="inteligencia-module__content" aria-live="polite">{children ?? <p>Este tablero se está implementando. Los indicadores aparecerán cuando sus fuentes estén disponibles.</p>}</section>
  </div>;
}
