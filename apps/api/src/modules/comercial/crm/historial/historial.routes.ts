import { Router } from 'express';
import { historialParamsSchema, historialQuerySchema } from './historial.schema.js';
import * as service from './historial.service.js';

export const historialComercialRouter = Router({ mergeParams: true });

historialComercialRouter.get('/historial', async (req, res) => {
    const { clienteId } = historialParamsSchema.parse(req.params);
    const filtros = historialQuerySchema.parse(req.query);
    res.json({ data: await service.listar(clienteId, filtros) });
});
