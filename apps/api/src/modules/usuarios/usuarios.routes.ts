import { Router } from "express";
import * as usuariosController from "./usuarios.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";

import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const usuariosRouter = Router();

usuariosRouter.use(authenticate, authorize(ROLE_CODES.ADMIN));

usuariosRouter.post("/", usuariosController.crearUsuario);

usuariosRouter.get("/", usuariosController.listarUsuarios);

usuariosRouter.get("/:id", usuariosController.obtenerUsuarioPorId);

usuariosRouter.patch("/:id/estado", usuariosController.actualizarEstadoUsuario);

usuariosRouter.patch("/:id", usuariosController.actualizarUsuario);
