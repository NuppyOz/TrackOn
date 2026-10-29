import { Router } from 'express';
import {
    actualizarConceptoSchema,
    cambiarEstadoTarifaSchema,
    crearConceptoSchema,
    crearTarifaSchema,
    idParamsSchema,
    listarConceptosSchema,
    listarTarifasSchema,
    resolverTarifaQuerySchema,
} from './tarifas.schema.js';
import * as service from './tarifas.service.js';

export const tarifasComercialesRouter = Router();

tarifasComercialesRouter.get('/conceptos', async (req, res) => {
    const filtros = listarConceptosSchema.parse(req.query);
    res.json({ data: await service.listarConceptos(filtros) });
});

tarifasComercialesRouter.post('/conceptos', async (req, res) => {
    const body = crearConceptoSchema.parse(req.body);
    res.status(201).json({ data: await service.crearConcepto(body) });
});

tarifasComercialesRouter.patch('/conceptos/:id', async (req, res) => {
    const params = idParamsSchema.parse(req.params);
    const body = actualizarConceptoSchema.parse(req.body);
    res.json({ data: await service.actualizarConcepto(params.id, body) });
});

tarifasComercialesRouter.get('/tarifas/resolver', async (req, res) => {
    const query = resolverTarifaQuerySchema.parse(req.query);
    res.json({ data: await service.resolverTarifaHttp(query.clienteId, query.conceptoId) });
});

tarifasComercialesRouter.get('/tarifas', async (req, res) => {
    const filtros = listarTarifasSchema.parse(req.query);
    res.json({ data: await service.listarTarifas(filtros) });
});

tarifasComercialesRouter.post('/tarifas', async (req, res) => {
    const body = crearTarifaSchema.parse(req.body);
    res.status(201).json({ data: await service.crearTarifa(body) });
});

tarifasComercialesRouter.patch('/tarifas/:id/estado', async (req, res) => {
    const params = idParamsSchema.parse(req.params);
    const body = cambiarEstadoTarifaSchema.parse(req.body);
    res.json({ data: await service.cambiarEstadoTarifa(params.id, body) });
});
