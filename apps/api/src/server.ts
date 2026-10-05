import { app } from './app.js';
import { prisma } from './infrastructure/prisma.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = app.listen(port, host, () => {
    console.log(`API de TrackOn disponible en http://${host}:${port}`);
});

let cerrando = false;

function cerrarServidor(signal: NodeJS.Signals) {
    if (cerrando) return;
    cerrando = true;
    console.log(`Señal ${signal} recibida; cerrando la API.`);
    server.close(() => {
        void prisma.$disconnect().finally(() => {
            process.exitCode = 0;
        });
    });
}

process.once('SIGTERM', cerrarServidor);
process.once('SIGINT', cerrarServidor);
