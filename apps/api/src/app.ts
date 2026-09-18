import express from 'express';
import type { ErrorRequestHandler } from 'express';
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
const manejarErrores: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  console.error('Error al procesar la solicitud:', error)

  res.status(500).json({
    error: {
      message: 'No se pudo completar la solicitud.',
    },
  })
}

app.use(manejarErrores)