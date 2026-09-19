import express from 'express';
import { manageErrors } from './middlewares/error-handler.js';
import { prisma } from './infrastructure/prisma.js';

// Modulos importados
import { rolesRouter } from './modules/roles/roles.routes.js';

export const app = express();

app.get('/api/health', (_req, res) =>{
    res.json({
        status: 'ok',
        message: 'API de TrackOn funcionando correctamente',
    })
})

app.get('/api/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: 'ok',
            database: 'connected',
        })
    } catch (error) {
        console.log('La comprobación de conexión con PostgreSQL falló');

        res.status(503).json({
            status: 'unavailable',
            database: 'unavailable',
        })
    }
})

app.use('/api/roles', rolesRouter);

// Manejador de errores
app.use(manageErrors)