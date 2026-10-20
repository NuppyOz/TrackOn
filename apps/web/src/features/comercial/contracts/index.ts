export type Envelope<T> = { data: T };
export type Pagina<T> = { items: T[]; pagina: number; limite: number; hayMas: boolean };

export type SeccionComercial = 'crm' | 'cotizaciones-ventas' | 'catalogo-tarifas' | 'portal-cuentas';
export const seccionesComerciales: ReadonlyArray<{ id: SeccionComercial; label: string }> = [
  { id: 'crm', label: 'Clientes y CRM' },
  { id: 'cotizaciones-ventas', label: 'Cotizaciones y ventas' },
  { id: 'catalogo-tarifas', label: 'Catálogo y tarifas' },
  { id: 'portal-cuentas', label: 'Acceso al portal' },
];

