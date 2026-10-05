import { Router } from 'express';
import * as controller from './servicios.controller.js';

export const serviciosRouter = Router();
serviciosRouter.get('/disponibles', controller.listarDisponibles);
serviciosRouter.get('/', controller.listar);
serviciosRouter.post('/', controller.crear);
serviciosRouter.get('/:id', controller.obtener);
serviciosRouter.patch('/:id/estado', controller.actualizarEstado);
serviciosRouter.patch('/:id', controller.actualizar);
