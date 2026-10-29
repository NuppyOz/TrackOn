import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import * as schema from './movimientos.schema.js';
import * as service from './movimientos.service.js';

export const movimientosGerencialesRouter = Router();
function autor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

movimientosGerencialesRouter.get('/movimientos', async (req, res) => {
  res.json({ data: await service.listarMovimientos(schema.listarMovimientosSchema.parse(req.query)) });
});
movimientosGerencialesRouter.get('/movimientos/:id', async (req, res) => {
  const { id } = schema.movimientoIdSchema.parse(req.params);
  res.json({ data: await service.obtenerMovimiento(id) });
});
movimientosGerencialesRouter.post('/movimientos', async (req, res) => {
  const input = schema.registrarMovimientoSchema.parse(req.body);
  const id = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try { res.status(201).json({ data: await service.crearMovimiento(input, id, key) }); }
  catch (error) { service.conflicto(error); }
});
movimientosGerencialesRouter.post('/movimientos/:id/revertir', async (req, res) => {
  const { id } = schema.movimientoIdSchema.parse(req.params);
  const input = schema.revertirMovimientoSchema.parse(req.body);
  const actor = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  try { res.json({ data: await service.revertirMovimiento(id, input, actor, key) }); }
  catch (error) { service.conflicto(error); }
});
