import { Router } from "express";

import * as controller from "./materiales.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const materialesRouter = Router();

materialesRouter.use(authenticate);

materialesRouter.get(
    "/disponibles",
    authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC),
    controller.listarDisponibles,
);

materialesRouter.get("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);

materialesRouter.post("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);

materialesRouter.get("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);

materialesRouter.patch("/:id/estado", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizarEstado);

materialesRouter.patch("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizar);
