import { Router } from 'express';
import * as controller from './notas.controller.js';

export const notasRouter = Router({ mergeParams: true });
notasRouter.get('/notas', controller.listarNotas);
notasRouter.post('/notas', controller.crearNota);
