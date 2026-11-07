import type { ReactNode } from 'react';
import { seccionesInteligencia, type SeccionInteligencia } from './contracts';
import './InteligenciaModule.css';
import { SectionSelector } from '../erp-ui/components';

export type InteligenciaModuleProps = {
  section: SeccionInteligencia;
  children?: ReactNode;
  showHeading?: boolean;
  availableSections?: SeccionInteligencia[];
  onNavigate?: (section: SeccionInteligencia) => void;
};

export function InteligenciaModule({ section, children, availableSections = [section], onNavigate, showHeading = true }: InteligenciaModuleProps) {
  const active = seccionesInteligencia.find(item => item.id === section);
  const available = seccionesInteligencia.filter(item => availableSections.includes(item.id));
  return <div className={`inteligencia-scope inteligencia-module${children ? ' inteligencia-module--content' : ''}`} aria-labelledby={showHeading ? 'inteligencia-title' : undefined}>
    {showHeading && <header className="inteligencia-module__header"><p className="inteligencia-module__eyebrow">MultiCore ERP · Inteligencia</p><h1 id="inteligencia-title">{active?.label ?? 'Inteligencia'}</h1></header>}
    {onNavigate && available.length > 1 && <SectionSelector label="Indicadores" value={section}
      options={available.map(item => ({ value: item.id, label: item.label }))}
      onChange={value => onNavigate(value as SeccionInteligencia)} />}
    <section className="inteligencia-module__content" aria-live="polite">{children ?? <p>Este tablero se está implementando. Los indicadores aparecerán cuando sus fuentes estén disponibles.</p>}</section>
  </div>;
}
