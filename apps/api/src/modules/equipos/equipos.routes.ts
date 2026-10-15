import { Router } from "express";

import * as controller from "./equipos.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const equiposRouter = Router();

equiposRouter.use(authenticate);

equiposRouter.get(
    "/ubicaciones",
    authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC),
    controller.listarUbicaciones,
);

equiposRouter.get("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);

equiposRouter.post("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);

equiposRouter.get("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);

equiposRouter.patch("/:id/estado", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizarEstado);

equiposRouter.patch("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizar);
