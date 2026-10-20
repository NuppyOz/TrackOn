import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import * as schema from './articulos.schema.js';
import * as service from './articulos.service.js';

export const articulosGerencialesRouter = Router();
function autor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

articulosGerencialesRouter.get('/articulos', async (req, res) => {
  res.json({ data: await service.listarArticulos(schema.listarArticulosSchema.parse(req.query)) });
});
articulosGerencialesRouter.get('/articulos/:id', async (req, res) => {
  const { id } = schema.articuloIdSchema.parse(req.params);
  res.json({ data: await service.obtenerArticulo(id) });
});
articulosGerencialesRouter.post('/articulos', async (req, res) => {
  const input = schema.crearArticuloSchema.parse(req.body);
  const id = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.status(201).json({ data: await service.crearArticulo(input, id, key) });
});
