import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

interface Job {
    id: number;
    type: 'sha256';
    payload: ArrayBuffer;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
}

interface Slot { worker: Worker; job?: Job }

class CpuWorkerPool {
    private readonly slots: Slot[] = [];
    private readonly queue: Job[] = [];
    private sequence = 0;
    private closed = false;

    constructor(size: number) {
        for (let index = 0; index < size; index++) this.addWorker();
    }

    private addWorker() {
        if (this.closed) return;
        const source = import.meta.url.endsWith('.ts');
        const workerUrl = new URL(source ? '../workers/cpu.worker.ts' : '../workers/cpu.worker.js', import.meta.url);
        const slot: Slot = { worker: new Worker(workerUrl) };
        slot.worker.unref();
        slot.worker.on('message', (message: { id: number; result?: string; error?: string }) => {
            if (!slot.job || slot.job.id !== message.id) return;
            const job = slot.job;
            slot.job = undefined;
            if (message.error) job.reject(new Error(message.error));
            else if (message.result) job.resolve(message.result);
            else job.reject(new Error('El worker CPU devolvió una respuesta inválida.'));
            this.dispatch();
        });
        slot.worker.on('error', error => {
            slot.job?.reject(error);
            slot.job = undefined;
        });
        slot.worker.on('exit', code => {
            const index = this.slots.indexOf(slot);
            if (index >= 0) this.slots.splice(index, 1);
            if (slot.job) slot.job.reject(new Error(`El worker CPU terminó con código ${code}.`));
            if (!this.closed) this.addWorker();
            this.dispatch();
        });
        this.slots.push(slot);
    }

    private dispatch() {
        for (const slot of this.slots) {
            if (slot.job || this.queue.length === 0) continue;
            const job = this.queue.shift();
            if (!job) break;
            slot.job = job;
            slot.worker.postMessage({ id: job.id, type: job.type, payload: job.payload }, [job.payload]);
        }
    }

    run(type: Job['type'], payload: ArrayBuffer) {
        if (this.closed) return Promise.reject(new Error('El pool CPU está cerrado.'));
        return new Promise<string>((resolve, reject) => {
            this.queue.push({ id: ++this.sequence, type, payload, resolve, reject });
            this.dispatch();
        });
    }

    async close() {
        this.closed = true;
        const error = new Error('La API se está cerrando.');
        for (const job of this.queue.splice(0)) job.reject(error);
        await Promise.allSettled(this.slots.map(slot => slot.worker.terminate()));
        this.slots.length = 0;
    }
}

let pool: CpuWorkerPool | null = null;

function workerPool() {
    if (!pool) {
        const configured = Number(process.env.CPU_WORKER_COUNT);
        const size = Number.isInteger(configured) && configured > 0
            ? Math.min(configured, 8)
            : Math.max(1, Math.min(2, availableParallelism() - 1));
        pool = new CpuWorkerPool(size);
    }
    return pool;
}

export function sha256InWorker(content: Buffer) {
    const transferable = Uint8Array.from(content);
    return workerPool().run('sha256', transferable.buffer);
}

export async function closeCpuWorkers() {
    const current = pool;
    pool = null;
    await current?.close();
}
