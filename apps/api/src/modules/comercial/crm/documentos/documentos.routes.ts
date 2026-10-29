import { Router } from 'express';
import * as controller from './documentos.controller.js';

export const documentosRouter = Router({ mergeParams: true });
documentosRouter.get('/documentos', controller.listarDocumentos);
documentosRouter.post('/documentos', controller.crearDocumento);
