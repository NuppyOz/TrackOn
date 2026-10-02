import { Router } from 'express';

import * as clientesController
    from './clientes.controller.js';

import {
    authenticate,
} from '../../middlewares/authenticate.js';

import {
    authorize,
} from '../../middlewares/authorize.js';

import {
    ROLE_CODES,
} from '../../security/roles.js';

export const clientesRouter = Router();

clientesRouter.post(
    '/',
    authenticate,
    authorize(
        ROLE_CODES.ADMIN,
        ROLE_CODES.GTE_OPE,
    ),
    clientesController.crearCliente,
);