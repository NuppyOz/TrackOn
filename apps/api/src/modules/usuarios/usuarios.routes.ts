import { Router } from 'express';
import * as usuariosController from './usuarios.controller.js';

export const usuariosRouter = Router();

usuariosRouter.post(
    '/',
    usuariosController.crearUsuario,
);

usuariosRouter.get(
    '/',
    usuariosController.listarUsuarios,
);

usuariosRouter.get(
    '/:id',
    usuariosController.obtenerUsuarioPorId,
);

usuariosRouter.patch(
    '/:id/estado',
    usuariosController.actualizarEstadoUsuario,
);

usuariosRouter.patch(
    '/:id',
    usuariosController.actualizarUsuario,
);