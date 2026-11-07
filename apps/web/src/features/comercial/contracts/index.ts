export type Envelope<T> = { data: T };
export type Pagina<T> = { items: T[]; pagina: number; limite: number; hayMas: boolean; total?: number };

export type SeccionComercial = 'crm' | 'ventas' | 'catalogo' | 'portal-cuentas';
export const seccionesComerciales: ReadonlyArray<{ id: SeccionComercial; label: string }> = [
  { id: 'crm', label: 'Gestión de clientes (CRM)' },
  { id: 'ventas', label: 'Gestión de ventas' },
  { id: 'catalogo', label: 'Catálogo comercial' },
  { id: 'portal-cuentas', label: 'Accesos de clientes' },
];

