import express from "express";
import { manageErrors } from "./middlewares/error-handler.js";
import { prisma } from "./infrastructure/prisma.js";

// Modulos importados
import { rolesRouter } from "./modules/roles/roles.routes.js";
import { empleadosRouter } from "./modules/empleados/empleados.routes.js";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { clientesRouter } from "./modules/clientes/clientes.routes.js";
import { equiposRouter } from './modules/equipos/equipos.routes.js';
import { serviciosRouter } from './modules/servicios/servicios.routes.js';
import { cuadrillasRouter } from './modules/cuadrillas/cuadrillas.routes.js';
import { notificacionesRouter } from './modules/notificaciones/notificaciones.routes.js';
import { requestObservability } from './middlewares/request-observability.js';
import { ubicacionesRouter } from "./modules/ubicaciones/ubicaciones.routes.js";


export const app = express();
app.use(express.json({ limit: '1mb'}))
app.use(requestObservability);

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "API de TrackOn funcionando correctamente",
    });
});

app.get("/api/ready", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: "ok",
            database: "connected",
        });
    } catch (error: unknown) {
        console.error(
            "La comprobación de conexión con PostgreSQL falló:",
            error,
        );

        res.status(503).json({
            status: "unavailable",
            database: "unavailable",
        });
    }
});

app.use('/api/roles', rolesRouter);
app.use('/api/empleados', empleadosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/auth', authRouter)
app.use('/api/clientes', clientesRouter);
app.use('/api/equipos', equiposRouter);
app.use('/api/servicios', serviciosRouter);
app.use('/api/cuadrillas', cuadrillasRouter);
app.use('/api/notificaciones', notificacionesRouter);
app.use("/api/ubicaciones", ubicacionesRouter);

// Manejador de errores
app.use(manageErrors)
