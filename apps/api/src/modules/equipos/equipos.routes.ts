import { Router } from 'express';
import * as controller from './equipos.controller.js';

export const equiposRouter = Router();
equiposRouter.get('/ubicaciones', controller.listarUbicaciones);
equiposRouter.get('/', controller.listar);
equiposRouter.post('/', controller.crear);
equiposRouter.get('/:id', controller.obtener);
equiposRouter.patch('/:id/estado', controller.actualizarEstado);
equiposRouter.patch('/:id', controller.actualizar);
