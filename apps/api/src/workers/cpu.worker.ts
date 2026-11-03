import { createHash } from 'node:crypto';
import { parentPort } from 'node:worker_threads';

interface CpuMessage {
    id: number;
    type: 'sha256';
    payload: ArrayBuffer;
}

if (!parentPort) throw new Error('El worker CPU necesita un canal con el proceso principal.');

parentPort.on('message', (message: CpuMessage) => {
    try {
        if (message.type !== 'sha256') throw new Error(`Tarea CPU desconocida: ${String(message.type)}`);
        const result = createHash('sha256').update(new Uint8Array(message.payload)).digest('hex');
        parentPort!.postMessage({ id: message.id, result });
    } catch (error) {
        parentPort!.postMessage({ id: message.id, error: error instanceof Error ? error.message : 'La tarea CPU falló.' });
    }
});
