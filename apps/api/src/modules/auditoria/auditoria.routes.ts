import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLE_CODES } from '../../security/roles.js';
import { prisma } from '../../infrastructure/prisma.js';
import { paginacionQueryShape, paginaDesde } from '../../shared/pagination.js';

const filtrosSchema = z.strictObject({ entidad: z.string().trim().max(80).optional(), ...paginacionQueryShape });
export const auditoriaRouter = Router();
auditoriaRouter.use(authenticate, authorize(ROLE_CODES.ADMIN));
auditoriaRouter.get('/', async (req, res, next) => {
    try {
        const filtros = filtrosSchema.parse(req.query);
        const items = await prisma.auditoria.findMany({
            where: filtros.entidad ? { entidad: filtros.entidad } : {},
            skip: (filtros.pagina - 1) * filtros.limite, take: filtros.limite + 1,
            orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
            select: { id: true, entidad: true, entidadId: true, accion: true, fecha: true, tipoActor: true,
                usuario: { select: { identificador: true } } },
        });
        res.json({ data: paginaDesde(items, filtros) });
    } catch (error) { next(error); }
});
