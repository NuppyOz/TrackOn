import { api } from '../../../shared/api';

export type FiltrosNotasDocumentos = {
  q?: string;
  pagina: number;
  limite: number;
  sortBy?: 'id' | 'creadaEn';
  sortDir?: 'asc' | 'desc';
};
export type Pagina<T> = { items: T[]; pagina: number; limite: number; hayMas: boolean };
export type PerfilComercial = { clienteId: number; clasificacion: string | null; instruccionesFacturacion: string | null; version: number };
export type ContactoComercial = { id: number; clienteId: number; nombre: string; email: string | null; telefono: string | null; cargo: string | null; activo: boolean; version: number; creadoEn?: string };
export type ContactoInput = { nombre: string; email?: string | null; telefono?: string | null; cargo?: string | null };
export type FiltrosContactos = { q?: string; pagina: number; limite: number; sortBy?: 'id' | 'nombre' | 'creadoEn'; sortDir?: 'asc' | 'desc' };
export type NotaComercial = { id: number; clienteId: number; autorId: number; texto: string; creadaEn: string };
export type DocumentoComercial = { id: number; clienteId: number; autorId: number; titulo: string; tipo: string; url: string | null; nota: string | null; creadaEn: string };

const base = (clienteId: number) => `/api/comercial/clientes/${clienteId}`;
type FiltrosListado = { q?: string; pagina: number; limite: number; sortBy?: string; sortDir?: 'asc' | 'desc' };
const query = (f: FiltrosListado) => {
  const params = new URLSearchParams({ pagina: String(f.pagina), limite: String(f.limite) });
  if (f.q?.trim()) params.set('q', f.q.trim());
  if (f.sortBy) params.set('sortBy', f.sortBy);
  if (f.sortDir) params.set('sortDir', f.sortDir);
  return params.toString();
};

export const obtenerPerfil = (clienteId: number) => api<PerfilComercial>(`${base(clienteId)}/perfil`);
export const actualizarPerfil = (clienteId: number, datos: { version: number; clasificacion?: string | null; instruccionesFacturacion?: string | null }) =>
  api<PerfilComercial>(`${base(clienteId)}/perfil`, { method: 'PUT', body: JSON.stringify(datos) });
export const listarContactos = (clienteId: number, f: FiltrosContactos) =>
  api<Pagina<ContactoComercial>>(`${base(clienteId)}/contactos?${query(f)}`);
export const crearContacto = (clienteId: number, datos: ContactoInput) =>
  api<ContactoComercial>(`${base(clienteId)}/contactos`, { method: 'POST', body: JSON.stringify(datos) });
export const actualizarContacto = (clienteId: number, id: number, datos: { version: number } & Partial<ContactoInput> & { activo?: boolean }) =>
  api<ContactoComercial>(`${base(clienteId)}/contactos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
export const listarNotas = (clienteId: number, filtros: FiltrosNotasDocumentos) =>
  api<Pagina<NotaComercial>>(`${base(clienteId)}/notas?${query(filtros)}`);
export const crearNota = (clienteId: number, datos: { texto: string }) =>
  api<NotaComercial>(`${base(clienteId)}/notas`, { method: 'POST', body: JSON.stringify(datos) });
export const listarDocumentos = (clienteId: number, filtros: FiltrosNotasDocumentos) =>
  api<Pagina<DocumentoComercial>>(`${base(clienteId)}/documentos?${query(filtros)}`);
export const crearDocumento = (clienteId: number, datos: { titulo: string; tipo: string; url?: string | null; nota?: string | null }) =>
  api<DocumentoComercial>(`${base(clienteId)}/documentos`, { method: 'POST', body: JSON.stringify(datos) });
