import type { ErrorRequestHandler } from "express";
import { string, ZodError } from 'zod';
import { AppError } from "../errors/AppError.js";

export const manageErrors: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    next,
) => {
    if (res.headersSent) {
        next(error)
        return
    }

    if (error instanceof ZodError) {
        res.status(400).json({
            error: {
                message: 'Los datos enviados no son válidos',
                details: error.issues.map((problem) => ({
                    field: problem.path.map(String).join('.'),
                    message: problem.message,
                })),
            },
        })
        return
    }

    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            error: {
                message: error.message,
            },
        })
        return
    }

    console.error('Error inesperado al procesar la solicitud: ', error)

    res.status(500).json({
        error: {
            message: 'Ocurrió un error interno. Inténtalo nuevamente.',
        },
    })
}