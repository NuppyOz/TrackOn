import { Router } from "express";

import * as controller from "./servicios.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const serviciosRouter = Router();

serviciosRouter.use(authenticate);

serviciosRouter.get(
    "/disponibles",
    authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC),
    controller.listarDisponibles,
);

serviciosRouter.get("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);

serviciosRouter.post("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);

serviciosRouter.get("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);

serviciosRouter.patch("/:id/estado", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizarEstado);

serviciosRouter.patch("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizar);
