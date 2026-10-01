import { Router } from "express";

import * as rolesController from "./roles.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";

import { authorize } from "../../middlewares/authorize.js";

import { ROLE_CODES } from "../../security/roles.js";

export const rolesRouter = Router();

rolesRouter.use(authenticate, authorize(ROLE_CODES.ADMIN));

rolesRouter.get("/", rolesController.listarRoles);
