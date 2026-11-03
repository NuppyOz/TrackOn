import { app } from './app.js';
import { prisma } from './infrastructure/prisma.js';
import { createServer } from 'node:http';
import { attachRealtimeServer } from './infrastructure/realtime.js';
import { closeCache } from './infrastructure/cache.js';
import { closeCpuWorkers } from './infrastructure/cpu-worker-pool.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer(app);
const realtimeServer = attachRealtimeServer(server);
server.listen(port, host, () => {
    console.log(`API de TrackOn disponible en http://${host}:${port}`);
});

let cerrando = false;

function cerrarServidor(signal: NodeJS.Signals) {
    if (cerrando) return;
    cerrando = true;
    console.log(`Señal ${signal} recibida; cerrando la API.`);
    for (const client of realtimeServer.clients) client.terminate();
    realtimeServer.close();
    server.close(() => {
        void Promise.allSettled([prisma.$disconnect(), closeCache(), closeCpuWorkers()]).finally(() => {
            process.exitCode = 0;
        });
    });
    server.closeAllConnections();
}

process.once('SIGTERM', cerrarServidor);
process.once('SIGINT', cerrarServidor);
