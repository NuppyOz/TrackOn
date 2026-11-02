import { Router, type Request } from 'express';
import { AppError } from '../../../errors/AppError.js';
import { convertirVentaBodySchema, convertirVentaParamsSchema, listarVentasQuerySchema } from './ventas.schema.js';
import * as service from './ventas.service.js';

export const ventasRouter = Router();

function usuarioId(req: Request): number {
    const id = req.auth?.usuario?.id;
    if (!Number.isSafeInteger(id) || !id || id < 1) throw new AppError(401, 'Se requiere autenticación.');
    return id;
}

ventasRouter.post('/cotizaciones/:id/convertir-venta', async (req, res) => {
    const { id } = convertirVentaParamsSchema.parse(req.params);
    const { version } = convertirVentaBodySchema.parse(req.body);
    const clave = req.get('Idempotency-Key');
    if (!clave) throw new AppError(400, 'Se requiere una Idempotency-Key válida.');
    res.status(201).json({ data: await service.convertirVenta(id, version, usuarioId(req), clave) });
});

ventasRouter.get('/ventas', async (req, res) => {
    const filtros = listarVentasQuerySchema.parse(req.query);
    res.json({ data: await service.listarVentas(filtros) });
});

ventasRouter.get('/ventas/:id', async (req, res) => {
    const { id } = convertirVentaParamsSchema.parse(req.params);
    res.json({ data: await service.obtenerVenta(id) });
});
