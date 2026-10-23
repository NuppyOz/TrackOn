import { Router, type Request } from 'express';
import { AppError } from '../../../../errors/AppError.js';
import { claveIdempotencia } from '../../../../infrastructure/idempotencia.js';
import * as schema from './herramientas.schema.js';
import * as service from './herramientas.service.js';

export const herramientasGerencialesRouter = Router();
function autor(req: Request) {
  const id = req.auth?.usuario.id;
  if (!id) throw new AppError(401, 'Se requiere autenticación.');
  return id;
}

herramientasGerencialesRouter.get('/herramientas', async (req, res) => {
  res.json({ data: await service.listar(schema.listarHerramientasSchema.parse(req.query)) });
});
herramientasGerencialesRouter.post('/herramientas', async (req, res) => {
  const body = schema.crearHerramientaSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.status(201).json({ data: await service.crear(body, usuarioId, key) });
});
herramientasGerencialesRouter.get('/herramientas/:id', async (req, res) => {
  const { id } = schema.herramientaIdSchema.parse(req.params);
  res.json({ data: await service.obtener(id) });
});
herramientasGerencialesRouter.post('/herramientas/:id/prestar', async (req, res) => {
  const { id } = schema.herramientaIdSchema.parse(req.params);
  const body = schema.prestarHerramientaSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.json({ data: await service.prestar(id, body, usuarioId, key) });
});
herramientasGerencialesRouter.post('/prestamos/:id/devolver', async (req, res) => {
  const { id } = schema.prestamoIdSchema.parse(req.params);
  const body = schema.devolverPrestamoSchema.parse(req.body);
  const usuarioId = autor(req);
  const key = claveIdempotencia(req.get('Idempotency-Key'));
  res.json({ data: await service.devolver(id, body, usuarioId, key) });
});
