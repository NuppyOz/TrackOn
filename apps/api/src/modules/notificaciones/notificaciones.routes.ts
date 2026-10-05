import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import * as controller from './notificaciones.controller.js';
export const notificacionesRouter = Router();
notificacionesRouter.use(requireAuth);
notificacionesRouter.get('/unread-count', controller.contarNoLeidas);
notificacionesRouter.get('/', controller.listar);
notificacionesRouter.patch('/:id/leida', controller.marcarLeida);
