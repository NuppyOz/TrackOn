import { Router } from "express";

import * as controller from "./cuadrillas.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const cuadrillasRouter = Router();

cuadrillasRouter.use(authenticate, authorize(ROLE_CODES.ADMIN, ROLE_CODES.GTE_OPE));

cuadrillasRouter.get("/empleados-elegibles", controller.listarEmpleados);

cuadrillasRouter.get("/", controller.listar);

cuadrillasRouter.post("/", controller.crear);

cuadrillasRouter.get("/:id", controller.obtener);

cuadrillasRouter.patch("/:id/estado", controller.actualizarEstado);

cuadrillasRouter.patch("/:id", controller.actualizar);

cuadrillasRouter.post("/:id/miembros", controller.agregarMiembro);

cuadrillasRouter.patch("/:id/lider", controller.definirLider);

cuadrillasRouter.delete("/:id/miembros/:miembroId", controller.retirarMiembro);
