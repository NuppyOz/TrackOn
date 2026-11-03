import { randomUUID } from 'node:crypto';
import { publishRealtime } from './realtime.js';

type Task = { id: string; usuarioId: number; type: string; run: () => Promise<Record<string, unknown>> };
const queue: Task[] = [];
let running = 0;
const concurrency = 2;

function processQueue() {
    while (running < concurrency && queue.length > 0) {
        const task = queue.shift();
        if (!task) return;
        running++;
        void task.run()
            .then(data => publishRealtime({ type: `${task.type}.completed`, data: { jobId: task.id, ...data } }, [task.usuarioId]))
            .catch(error => publishRealtime({ type: `${task.type}.failed`, data: {
                jobId: task.id,
                message: error instanceof Error ? error.message : 'El trabajo en segundo plano falló.',
            } }, [task.usuarioId]))
            .finally(() => { running--; processQueue(); });
    }
}

export function enqueueBackgroundJob(usuarioId: number, type: string, run: Task['run']) {
    const id = randomUUID();
    queue.push({ id, usuarioId, type, run });
    setImmediate(processQueue);
    return id;
}
