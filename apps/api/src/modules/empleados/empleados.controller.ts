import type { Request, Response, NextFunction } from "express";
import { createEmpleadoSchema, empleadoParamsSchema } from "./empleados.schema.js";
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

export async function listarEmpleado(
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    try{
        const empleados = await empleadosService.listarEmpleados();

        res.status(200).json ({
            data: empleados,
        })
    } catch (error) {
        next(error)
    }
}

export async function obtenerEmpleadoPorId(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { id } = empleadoParamsSchema.parse(req.params);

        const empleado =
            await empleadosService.obtenerEmpleadoPorId(id);

        res.status(200).json({
            data: empleado,
        });
    } catch (error) {
        next(error);
    }
}