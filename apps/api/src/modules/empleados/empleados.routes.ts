import { Router } from "express";
import * as empleadosController from "./empleados.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";

import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const empleadosRouter = Router();

empleadosRouter.use(
    authenticate,
    authorize(
        ROLE_CODES.ADMIN,
        ROLE_CODES.GTE_OPE,
    ),
);

empleadosRouter.post("/", empleadosController.crearEmpleado);
empleadosRouter.get("/", empleadosController.listarEmpleado);
empleadosRouter.get("/:id", empleadosController.obtenerEmpleadoPorId);
empleadosRouter.patch("/:id/estado", empleadosController.actualizarEstadoEmpleado);
empleadosRouter.patch("/:id/habilitacion-tecnica", empleadosController.actualizarHabilitacionTecnica);
empleadosRouter.patch("/:id", empleadosController.actualizarEmpleado);
