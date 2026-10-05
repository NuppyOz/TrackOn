import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../infrastructure/prisma.js';
import { verifyAccessToken } from '../security/access-token.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const authorization = req.header('authorization')?.trim();
        const [scheme, ...credentials] = authorization?.split(/\s+/) ?? [];
        const token = credentials.join(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AppError(401, 'Debes iniciar sesión.');
        let claims: { usuarioId: number; sesionId: number };
        try { claims = await verifyAccessToken(token); }
        catch { throw new AppError(401, 'La sesión no es válida o expiró.'); }
        const { usuarioId, sesionId } = claims;
        const session = await prisma.sesion.findFirst({
            where: { id: sesionId, usuarioId, revocadaEn: null, expiraEn: { gt: new Date() }, usuario: { activo: true, empleado: { active: true } } },
            select: { id: true, usuario: { select: { rol: { select: { cod: true } }, empleado: { select: { habilitadoComoTecnico: true } } } } },
        });
        if (!session) throw new AppError(401, 'La sesión ya no está activa.');
        if (session.usuario.rol.cod === 'TEC' && !session.usuario.empleado.habilitadoComoTecnico) throw new AppError(403, 'El empleado no está habilitado como técnico.');
        res.locals.usuarioId = usuarioId;
        next();
    } catch (error) { next(error); }
}
