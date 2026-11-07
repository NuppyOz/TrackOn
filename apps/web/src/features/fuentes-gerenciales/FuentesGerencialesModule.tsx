import type { ReactNode } from 'react';
import { seccionesFuentesGerenciales, type SeccionFuenteGerencial } from './contracts';
import './FuentesGerencialesModule.css';
import { SectionSelector } from '../erp-ui/components';

export type FuentesGerencialesModuleProps = {
  section: SeccionFuenteGerencial;
  children?: ReactNode;
  showHeading?: boolean;
  availableSections?: SeccionFuenteGerencial[];
  onNavigate?: (section: SeccionFuenteGerencial) => void;
};

export function FuentesGerencialesModule({ section, children, availableSections = [section], onNavigate, showHeading = true }: FuentesGerencialesModuleProps) {
  const active = seccionesFuentesGerenciales.find(item => item.id === section);
  const available = seccionesFuentesGerenciales.filter(item => availableSections.includes(item.id));
  return <div className={`fuentes-scope fuentes-gerenciales-module${children ? ' fuentes-gerenciales-module--content' : ''}`} aria-labelledby={showHeading ? 'fuentes-gerenciales-title' : undefined}>
    {showHeading && <header className="fuentes-gerenciales-module__header"><p className="fuentes-gerenciales-module__eyebrow">TrackOn · Registros de origen</p><h1 id="fuentes-gerenciales-title">{active?.label ?? 'Registros de origen'}</h1></header>}
    {onNavigate && available.length > 1 && <SectionSelector label="Área de registros" value={section}
      options={available.map(item => ({ value: item.id, label: item.label }))}
      onChange={value => onNavigate(value as SeccionFuenteGerencial)} />}
    <section className="fuentes-gerenciales-module__content" aria-live="polite">{children ?? <p>Los registros de origen de esta sección se están implementando.</p>}</section>
  </div>;
}
