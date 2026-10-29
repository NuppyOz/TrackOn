export type SeccionFuenteGerencial = 'contratos' | 'finanzas' | 'logistica' | 'calidad';
export const seccionesFuentesGerenciales: ReadonlyArray<{ id: SeccionFuenteGerencial; label: string }> = [
  { id: 'contratos', label: 'Contratos' }, { id: 'finanzas', label: 'Registros financieros' },
  { id: 'logistica', label: 'Registros logísticos' }, { id: 'calidad', label: 'Registros de calidad' },
];
