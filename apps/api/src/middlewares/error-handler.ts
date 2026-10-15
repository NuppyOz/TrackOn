import type { ErrorRequestHandler } from "express";
import { ZodError } from 'zod';
import { AppError } from "../errors/AppError.js";
import { Prisma } from '@prisma/client';

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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        res.status(409).json({ error: { message: 'La información cambió durante la operación. Actualízala e inténtalo de nuevo.' } });
        return;
    }
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
        res.status(413).json({ error: { message: 'El archivo supera el tamaño permitido.' } });
        return;
    }

    console.error('Error inesperado al procesar la solicitud: ', error)

    res.status(500).json({
        error: {
            message: 'Ocurrió un error interno. Inténtalo nuevamente.',
        },
    })
}
