import type { Request, Response, NextFunction } from "express";
import { createEmpleadoSchema } from "./empleados.schema.js";
import * as empleadosService from './empleados.service.js';

export async function crearEmpleado(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const datos = createEmpleadoSchema.parse(req.body)

        const empleado = await empleadosService.crearEmpleado(datos)

        res.status(201).json({
            data: empleado,
        })
    } catch (error) {
        next(error)
    }
}