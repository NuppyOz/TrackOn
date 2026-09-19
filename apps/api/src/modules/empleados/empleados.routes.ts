import { Router } from 'express'
import * as empleadosController from './empleados.controller.js'

export const empleadosRouter = Router()

empleadosRouter.post('/', empleadosController.crearEmpleado)