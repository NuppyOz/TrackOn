import { Router } from 'express';
import * as controller from './cuadrillas.controller.js';

export const cuadrillasRouter = Router();
cuadrillasRouter.get('/empleados-elegibles', controller.listarEmpleados);
cuadrillasRouter.get('/', controller.listar);
cuadrillasRouter.post('/', controller.crear);
cuadrillasRouter.get('/:id', controller.obtener);
cuadrillasRouter.patch('/:id/estado', controller.actualizarEstado);
cuadrillasRouter.patch('/:id', controller.actualizar);
cuadrillasRouter.post('/:id/miembros', controller.agregarMiembro);
cuadrillasRouter.patch('/:id/lider', controller.definirLider);
cuadrillasRouter.delete('/:id/miembros/:miembroId', controller.retirarMiembro);
