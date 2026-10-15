import { api } from '../../shared/api';

export interface EvidenciaOrden {
    id: number; nombreOriginal: string; tipoArchivo: string; tamanoBytes: number; hashArchivo: string;
    estadoCarga: 'PENDIENTE' | 'DISPONIBLE' | 'FALLIDA'; cargadaPorId: number;
    reemplazos?: { id: number }[];
    revisiones?: { decision: 'ACEPTADA' | 'RECHAZADA'; observacion: string | null }[];
}
const ruta = (ordenId: number, registroId: number) => `/api/ordenes/${ordenId}/equipos/${registroId}/evidencias`;
export function listarEvidencias(ordenId: number, registroId: number) { return api<EvidenciaOrden[]>(ruta(ordenId, registroId)); }
export async function prepararEvidencia(ordenId: number, registroId: number, archivo: File, reemplazaAId?: number) {
    if (archivo.size > 8 * 1024 * 1024 || archivo.size === 0) throw new Error('El archivo debe pesar entre 1 byte y 8 MB.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(archivo.type)) throw new Error('Selecciona una imagen JPG, PNG, WebP o un PDF.');
    const contenido = await archivo.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', contenido);
    const hashArchivo = Array.from(new Uint8Array(digest), valor => valor.toString(16).padStart(2, '0')).join('');
    const evidencia = await api<EvidenciaOrden>(ruta(ordenId, registroId), { method: 'POST', body: JSON.stringify({
        nombreOriginal: archivo.name, tipoArchivo: archivo.type, tamanoBytes: archivo.size, hashArchivo,
        ...(reemplazaAId ? { reemplazaAId } : {}),
    }) });
    return { evidencia, contenido };
}
export function cargarEvidencia(ordenId: number, registroId: number, evidenciaId: number, contenido: ArrayBuffer) {
    return api<EvidenciaOrden>(`${ruta(ordenId, registroId)}/${evidenciaId}/archivo`, {
        method: 'PUT', body: contenido, headers: { 'Content-Type': 'application/octet-stream' }, signal: AbortSignal.timeout(60000),
    });
}
export function descargarEvidencia(ordenId: number, registroId: number, evidenciaId: number) {
    return api<Blob>(`${ruta(ordenId, registroId)}/${evidenciaId}/archivo`, undefined, 'blob');
}
export function revisarEvidencia(ordenId: number, registroId: number, evidenciaId: number, decision: 'ACEPTADA' | 'RECHAZADA', observacion: string) {
    return api(`${ruta(ordenId, registroId)}/${evidenciaId}/revision`, { method: 'POST', body: JSON.stringify({ decision, observacion: observacion.trim() || null }) });
}
