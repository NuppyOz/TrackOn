import { Router } from 'express';
import { clienteIdParamsSchema, actualizarPerfilSchema } from '../../contracts/crm.schema.js';
import * as service from './perfil.service.js';

export const perfilComercialRouter = Router({ mergeParams: true });

perfilComercialRouter.get('/perfil', async (req, res) => {
    const params = clienteIdParamsSchema.parse(req.params);
    res.json({ data: await service.obtener(params.clienteId) });
});

perfilComercialRouter.put('/perfil', async (req, res) => {
    const params = clienteIdParamsSchema.parse(req.params);
    const body = actualizarPerfilSchema.parse(req.body);
    res.json({ data: await service.actualizar(params.clienteId, body) });
});
