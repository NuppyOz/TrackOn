import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as controller from './notificaciones.controller.js';
export const notificacionesRouter = Router();
notificacionesRouter.use(authenticate);
notificacionesRouter.get('/unread-count', controller.contarNoLeidas);
notificacionesRouter.get('/', controller.listar);
notificacionesRouter.patch('/:id/leida', controller.marcarLeida);
