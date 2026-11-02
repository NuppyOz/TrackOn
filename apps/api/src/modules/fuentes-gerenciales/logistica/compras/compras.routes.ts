import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import * as schema from './compras.schema.js';
import * as service from './compras.service.js';

export const comprasGerencialesRouter = Router();
function autor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

comprasGerencialesRouter.get('/', async (req, res) => {
  res.json({ data: await service.listar(schema.listarComprasSchema.parse(req.query)) });
});
comprasGerencialesRouter.get('/:id', async (req, res) => {
  const { id } = schema.compraIdSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
});
comprasGerencialesRouter.post('/', async (req, res) => {
  const body = schema.crearCompraSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.status(201).json({ data: await service.crear(body, usuarioId, key) });
});
comprasGerencialesRouter.post('/lineas/:id/recibir', async (req, res) => {
  const { id } = schema.lineaIdSchema.parse(req.params);
  const body = schema.recibirLineaSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.json({ data: await service.recibirLinea(id, body, usuarioId, key) });
});
comprasGerencialesRouter.post('/lineas/:id/cancelar-pendiente', async (req, res) => {
  const { id } = schema.lineaIdSchema.parse(req.params);
  const body = schema.cancelarPendienteSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.json({ data: await service.cancelarPendiente(id, body, usuarioId, key) });
});
