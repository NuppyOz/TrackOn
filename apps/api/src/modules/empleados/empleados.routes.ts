import { Router } from 'express'
import * as empleadosController from './empleados.controller.js'

export const empleadosRouter = Router()

empleadosRouter.post('/', empleadosController.crearEmpleado);
empleadosRouter.get('/', empleadosController.listarEmpleado);
empleadosRouter.get('/:id', empleadosController.obtenerEmpleadoPorId);
empleadosRouter.patch('/:id/estado', empleadosController.actualizarEstadoEmpleado);
empleadosRouter.patch('/:id/habilitacion-tecnica', empleadosController.actualizarHabilitacionTecnica);
empleadosRouter.patch('/:id', empleadosController.actualizarEmpleado);