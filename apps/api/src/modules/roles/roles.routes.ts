import { Router } from 'express'
import * as rolesController from './roles.controller.js'

export const rolesRouter = Router()

rolesRouter.get('/', rolesController.listarRoles)