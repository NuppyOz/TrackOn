/*
    Controlador para gestionar las operaciones
    relacionadas con los roles.


    El controller se encarga de la comunicación HTTP:
        - Solicita los datos al servicio.
        - Espera el resultado con await.
        - Responde con HTTP 200 y los roles en formato JSON.
        - Si ocurre un error, lo entrega al manejador de errores mediante next(error).

    _req representa la petición; el guion bajo indica que no necesitamos utilizarla en esta operación.
*/

import type { Request, Response, NextFunction } from 'express';
import * as rolesService from './roles.service.js';

export async function listarRoles(
    _req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const roles = await rolesService.listarRoles();
        res.status(200).json({
            data: roles,
        })
    } catch (error){
        next(error);
    }
}