import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { ROLE_CODES } from "../../security/roles.js";

import * as controller from "./ubicaciones.controller.js";

export const ubicacionesRouter = Router();

ubicacionesRouter.use(authenticate);

ubicacionesRouter.post("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.crear);

ubicacionesRouter.get("/", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.listar);

ubicacionesRouter.get("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE, ROLE_CODES.TEC), controller.obtener);

ubicacionesRouter.patch("/:id/estado", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.cambiarEstado);

ubicacionesRouter.patch("/:id", authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE), controller.actualizar);
