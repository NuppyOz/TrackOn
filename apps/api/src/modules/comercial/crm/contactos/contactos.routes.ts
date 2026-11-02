import { Router } from 'express';
import {
    actualizarContactoSchema,
    clienteIdParamsSchema,
    contactoIdParamsSchema,
    crearContactoSchema,
    listarContactosQuerySchema,
} from '../../contracts/crm.schema.js';
import * as service from './contactos.service.js';

export const contactosComercialesRouter = Router({ mergeParams: true });

contactosComercialesRouter.get('/contactos', async (req, res) => {
    const params = clienteIdParamsSchema.parse(req.params);
    const query = listarContactosQuerySchema.parse(req.query);
    res.json({ data: await service.listar(params.clienteId, query) });
});

contactosComercialesRouter.post('/contactos', async (req, res) => {
    const params = clienteIdParamsSchema.parse(req.params);
    const body = crearContactoSchema.parse(req.body);
    res.status(201).json({ data: await service.crear(params.clienteId, body) });
});

contactosComercialesRouter.patch('/contactos/:id', async (req, res) => {
    const params = contactoIdParamsSchema.parse(req.params);
    const body = actualizarContactoSchema.parse(req.body);
    res.json({ data: await service.actualizar(params.clienteId, params.id, body) });
});
