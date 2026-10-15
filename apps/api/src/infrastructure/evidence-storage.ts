import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export interface EvidenceStorage {
    guardar(clave: string, contenido: Buffer): Promise<void>;
    leer(clave: string): Promise<Buffer>;
}

// La interfaz permite sustituir el disco por S3 sin modificar el dominio.
export function almacenamientoEvidencias(directorio = process.env.EVIDENCE_STORAGE_DIR ?? 'storage/evidencias'): EvidenceStorage {
    const raiz = resolve(directorio);
    function ruta(clave: string) {
        if (!/^[a-f0-9-]{36}$/.test(clave)) throw new Error('Clave de evidencia inválida.');
        return resolve(raiz, clave);
    }
    return {
        async guardar(clave, contenido) {
            await mkdir(raiz, { recursive: true });
            const temporal = ruta(randomUUID());
            await writeFile(temporal, contenido, { flag: 'wx', mode: 0o600 });
            try { await rename(temporal, ruta(clave)); }
            finally { await rm(temporal, { force: true }); }
        },
        leer(clave) { return readFile(ruta(clave)); },
    };
}
